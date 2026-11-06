import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdtemp, rm, rmdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import jsonServer from 'json-server'
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'
import { sortProducts } from '../src/inventory/presentation/product-order.js'
import { productAvailability } from '../src/commercial/domain/product-availability.js'

test('stable catalog order, opaque IDs, stock and pending explanations', () => {
  const products = [{ id: 'X9PeXW7', name: 'Pan', stock: 0, price: 5.2 }, { id: 10, name: 'Arroz', stock: 2, price: 1 }, { id: 2, name: 'Arroz', stock: 2, price: 1 }]
  const original = JSON.stringify(products)
  assert.deepEqual(sortProducts(products).map(p => p.id), [2, 10, 'X9PeXW7'])
  assert.equal(JSON.stringify(products), original)
  assert.equal(productAvailability('purchase', products[0]), null)
  assert.equal(productAvailability('sale', products[0]), 'catalogEmptyStock')
  assert.equal(productAvailability('sale', products[1], true), 'commercialProductBlocked')
  assert.equal(productAvailability('sale', { ...products[1], price: 'invalid' }), 'commercialAmountError')
  assert.equal(productAvailability('purchase', { ...products[1], stock: true }), 'invalidProductStock')
})

test('numeric and alphanumeric product lifecycle using isolated JSON Server', async () => {
  const original = await readFile('tests/fixtures/legacy-db.json', 'utf8')
  const dir = await mkdtemp(join(tmpdir(), 'bodego-catalog-'))
  const target = join(dir, 'db.json')
  await writeFile(target, original)
  const app = jsonServer.create()
  app.use(jsonServer.bodyParser); app.use(jsonServer.router(target))
  const http = app.listen(0, '127.0.0.1')
  await new Promise(resolve => http.once('listening', resolve))
  const vite = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' })
  const load = name => vite.ssrLoadModule('/src/' + name)
  const storage = new Map()
  globalThis.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) }
  try {
    const { api } = await load('shared/infrastructure/http-client.js')
    api.defaults.baseURL = `http://127.0.0.1:${http.address().port}`
    setActivePinia(createPinia())
    const { useAuthStore } = await load('iam/application/auth.js')
    const { useProductsStore } = await load('inventory/application/products.js')
    const { useCommercialStore } = await load('commercial/application/commercial.js')
    const { createPurchase } = await load('commercial/domain/purchase.js')
    const { savePending } = await load('commercial/infrastructure/pending-journal.js')
    const auth = useAuthStore(), products = useProductsStore(), commercial = useCommercialStore()
    auth.user = { name: 'Isolated admin', role: 'Administrador', email: 'test@example.invalid' }
    const details = { category: 'Panader\u00eda', price: 5.2, stock: 0, expirationDate: '2030-12-31' }
    const alpha = await products.addProduct({ ...details, id: 'Alpha7', name: 'Pan aislado' })
    const numeric = await products.addProduct({ ...details, id: 9001, name: 'Arroz aislado' })
    assert.equal(alpha.id, 'Alpha7'); assert.equal(numeric.id, 9001)
    const auto = await products.addProduct({ ...details, name: 'Generated isolated' })
    assert.ok(auto.id != null)
    await products.deleteProduct(auto.id)
    await products.updateProductDetails(alpha.id, { ...alpha, name: 'Pan editado', stock: 500 })
    await products.loadProducts()
    assert.equal(products.products.find(p => p.id === alpha.id).stock, 0)
    assert.equal(products.products.find(p => p.id === alpha.id).name, 'Pan editado')
    // Matches the same case/accent-insensitive name and identifier lookup as the POS.
    const normalize = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    for (const query of ['PAN EDITADO', 'alpha7']) assert.equal(products.products.filter(p => normalize([p.name,p.id,p.category].join(' ')).includes(normalize(query))).length, 1)
    auth.user.role = 'Empleado'
    await assert.rejects(products.updateProductDetails(alpha.id, alpha), e => e.messageKey === 'accessDeniedMessage')
    await assert.rejects(products.deleteProduct(alpha.id), e => e.messageKey === 'accessDeniedMessage')
    async function cart(quantity, sale = false) {
      await products.loadProducts()
      return [alpha.id, numeric.id].map(id => { const p = products.products.find(p => String(p.id) === String(id)); return { productId: String(p.id), quantity: String(quantity), unitAmount: sale ? String(p.price) : '3.50', expectedStock: p.stock } })
    }
    const purchase = await commercial.register('purchase', await cart(3))
    assert.equal(purchase.status, 'completed'); assert.equal(purchase.totalMinor, 2100)
    for (const line of purchase.lines) { assert.equal(line.stockBefore, 0); assert.equal(line.stockAfter, 3) }
    await assert.rejects(commercial.register('sale', await cart(4, true)), e => e.messageKey === 'insufficientStock')
    const sale = await commercial.register('sale', await cart(2, true))
    assert.equal(sale.status, 'completed'); assert.equal(sale.totalMinor, 2080)
    const persisted = JSON.parse(await readFile(target, 'utf8'))
    for (const id of [alpha.id, numeric.id]) assert.equal(persisted.products.find(p => String(p.id) === String(id)).stock, 1)
    for (const document of [purchase, sale]) for (const line of document.lines) {
      const matching = persisted.operations.filter(o => o.sourceId === document.id && o.sourceLineId === line.id)
      assert.equal(matching.length, 1); assert.equal(matching[0].id, line.movementId)
      assert.equal(String(matching[0].productId), line.productId)
    }
    await commercial.load('purchase'); await commercial.load('sale')
    assert.ok(commercial.purchases.some(d => d.id === purchase.id))
    assert.ok(commercial.sales.some(d => d.id === sale.id))
    const pending = createPurchase(await cart(1), products.products, auth.user)
    pending.lines = pending.lines.filter(line => line.productId === alpha.id)
    pending.totalMinor = pending.lines[0].subtotalMinor
    pending.status = 'review'
    savePending('purchase', pending)
    await assert.rejects(commercial.register('purchase', await cart(1)), e => e.messageKey === 'commercialProductBlocked')
    auth.user.role = 'Administrador'
    await assert.rejects(products.deleteProduct(alpha.id), e => e.messageKey === 'productHasHistory')
    assert.equal(JSON.parse(storage.get('bodego-commercial-pending-v1'))[0].document.id, pending.id)
    assert.deepEqual(jsonServer.router(target).db.getState(), persisted)
    assert.equal(await readFile('tests/fixtures/legacy-db.json', 'utf8'), original)
    const { messages } = await load('i18n.js')
    for (const key of ['catalogEmptyStock','catalogAvailabilityUnknown','technicalProductId','commercialProductBlocked']) assert.ok(messages.es[key] && messages.en[key])
  } finally {
    await vite.close(); await new Promise(resolve => http.close(resolve))
    await rm(target); await rmdir(dir); delete globalThis.localStorage
  }
})

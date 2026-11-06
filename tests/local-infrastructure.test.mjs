import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import jsonServer from 'json-server'
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'

test('local JSON Server: authentication, stores, persistence and pending operations', async () => {
  const original = await readFile('tests/fixtures/legacy-db.json', 'utf8')
  const baseline = JSON.parse(original)
  const dir = await mkdtemp(join(tmpdir(), 'bodego-integration-'))
  const target = join(dir, 'db.json')
  await writeFile(target, original)
  const app = jsonServer.create()
  let fault = null
  app.use((req, res, next) => {
    if (fault && req.method === fault.method && req.path === fault.path) return res.status(503).json({ error: 'isolated test failure' })
    next()
  })
  app.use(jsonServer.bodyParser)
  app.use(jsonServer.router(target))
  const http = app.listen(0, '127.0.0.1')
  await new Promise(resolve => http.once('listening', resolve))
  const vite = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' })
  const load = path => vite.ssrLoadModule('/src/' + path)
  const storage = new Map()
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
  try {
    const { api, catalogApi, operationsApi } = await load('shared/infrastructure/http-client.js')
    assert.equal(catalogApi, operationsApi)
    api.defaults.baseURL = `http://127.0.0.1:${http.address().port}`
    setActivePinia(createPinia())
    const { useAuthStore } = await load('iam/application/auth.js')
    const { useProductsStore } = await load('inventory/application/products.js')
    const { useCommercialStore } = await load('commercial/application/commercial.js')
    const { useOperationsStore } = await load('operations/application/operations.js')
    const { useWasteStore } = await load('operations/application/waste.js')
    const { PERMISSIONS } = await load('iam/domain/permissions.js')
    const auth = useAuthStore(), products = useProductsStore(), commercial = useCommercialStore()
    const operations = useOperationsStore(), waste = useWasteStore()
    assert.equal(await auth.login('admin@bodego.com', 'wrong'), false)
    assert.equal(await auth.login('admin@bodego.com', '1234'), true)
    assert.ok(auth.can(PERMISSIONS.PRODUCTS_CREATE))
    assert.equal('password' in JSON.parse(storage.get('user')), false)
    auth.user = null
    await auth.loadUser()
    assert.equal(auth.user.role, 'Administrador')
    await products.loadProducts()
    assert.equal(products.products.length, baseline.products.length)
    const created = await products.addProduct({ name: 'Isolated CRUD', category: 'Hogar', price: 2, stock: 0, expirationDate: '2030-12-31' })
    await products.updateProductDetails(created.id, { ...created, name: 'Edited isolated', price: 3, stock: 999 })
    assert.equal(products.products.find(p => String(p.id) === String(created.id)).stock, 0)
    await products.deleteProduct(created.id)
    await assert.rejects(products.deleteProduct('3'), error => error.messageKey === 'productHasHistory')
    await assert.rejects(products.updateProductDetails('1', baseline.products[0]), error => error.messageKey === 'commercialProductBlocked')
    auth.logout()
    assert.equal(await auth.login('empleado@bodego.com', '1234'), true)
    assert.equal(auth.can(PERMISSIONS.PRODUCTS_CREATE), false)
    assert.equal(auth.can(PERMISSIONS.REPORTS_READ), false)
    await assert.rejects(products.addProduct({}), error => error.messageKey === 'accessDeniedMessage')
    const lines = () => ['3', '4'].map(id => {
      const p = products.products.find(p => String(p.id) === id)
      return { productId: id, quantity: '2', unitAmount: String(p.price), expectedStock: Number(p.stock) }
    })
    const purchase = await commercial.register('purchase', lines())
    assert.equal(purchase.status, 'completed')
    assert.equal(purchase.totalMinor, 1560)
    await products.loadProducts()
    const sale = await commercial.register('sale', lines())
    assert.equal(sale.status, 'completed')
    assert.equal(sale.totalMinor, 1560)
    await products.loadProducts()
    await assert.rejects(commercial.register('sale', [{ ...lines()[0], quantity: '999' }]), error => error.messageKey === 'insufficientStock')
    const p = products.products.find(p => String(p.id) === '4')
    await operations.registerOperation({ productId: p.id, quantity: 2, type: 'Entrada', expectedStock: p.stock })
    await products.loadProducts()
    await operations.registerOperation({ productId: p.id, quantity: 1, type: 'Salida', expectedStock: p.stock + 2 })
    await products.loadProducts()
    await waste.registerWaste({ productId: p.id, quantity: 1, reason: 'Producto vencido', expectedStock: p.stock + 1 })
    await products.loadProducts()
    const alerts = await load('monitoring/application/alerts.js')
    assert.ok(alerts.getLowStockProducts(products.products).some(p => String(p.id) === '3'))
    const reports = await load('reporting/application/reports.js')
    assert.equal(reports.getTotalProducts(products.products), baseline.products.length)
    assert.equal(reports.parseRecordDate(baseline.operations[0].date).date, null)
    const { messages, setLocale, t } = await load('i18n.js')
    assert.deepEqual(Object.keys(messages.es).sort(), Object.keys(messages.en).sort())
    for (const language of ['es', 'en']) { setLocale(language); assert.notEqual(t('loginServiceUnavailable'), 'loginServiceUnavailable') }
    fault = { method: 'GET', path: '/users' }
    auth.logout()
    assert.equal(await auth.login('admin@bodego.com', '1234'), false)
    assert.equal(auth.error, 'loginServiceUnavailable')
    fault = { method: 'GET', path: '/products' }
    await assert.rejects(products.loadProducts())
    assert.equal(products.loadError, 'loadProductsFailed')
    fault = null
    assert.equal(await auth.login('admin@bodego.com', '1234'), true)
    await products.loadProducts()
    // Inject a stock-write failure only into the isolated copy. No retry or reconciliation.
    fault = { method: 'PUT', path: '/products/4' }
    const product = products.products.find(p => String(p.id) === '4')
    await assert.rejects(commercial.register('purchase', [{ productId: '4', quantity: '1', unitAmount: '1', expectedStock: product.stock }]), error => error.messageKey === 'commercialWriteUncertain')
    fault = null
    await commercial.load('purchase')
    assert.equal(commercial.purchases.filter(d => d.status === 'review').length, 3)
    const persisted = JSON.parse(await readFile(target, 'utf8'))
    for (const name of ['operations', 'wastes', 'purchases', 'sales']) assert.deepEqual(persisted[name].slice(0, baseline[name].length), baseline[name])
    assert.deepEqual(persisted.users, baseline.users)
    assert.equal(persisted.products.length, baseline.products.length)
    // Reopen persistence through a fresh router, rather than trusting store memory.
    const reopened = jsonServer.router(target).db.getState()
    assert.deepEqual(reopened, persisted)
    api.defaults.baseURL = 'http://127.0.0.1:1'
    assert.equal(await auth.login('admin@bodego.com', '1234'), false)
    assert.equal(auth.error, 'loginServiceUnavailable')
    assert.equal(await readFile('tests/fixtures/legacy-db.json', 'utf8'), original)
  } finally {
    await vite.close()
    await new Promise(resolve => http.close(resolve))
    await rm(target)
    await rmdir(dir)
    delete globalThis.localStorage
  }
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdtemp, rm, rmdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer, loadEnv } from 'vite'
import jsonServer from 'json-server'
import { createPinia, setActivePinia } from 'pinia'
import { buildDemoDatabase, validateReferences, discardedPurchases } from '../demo/prepare-demo.mjs'

test('demo preserves stock, IDs and completed history, excluding only authorized purchases', async () => {
  const original = JSON.parse(await readFile('tests/fixtures/legacy-db.json', 'utf8'))
  const demo = buildDemoDatabase(original)
  assert.deepEqual(demo, buildDemoDatabase(original))
  for (const key of Object.keys(original).filter(k => k !== 'purchases')) assert.deepEqual(demo[key], original[key])
  assert.deepEqual(demo.purchases, original.purchases.filter(d => !discardedPurchases.some(entry => entry.id === d.id)))
  assert.equal(demo.purchases.filter(d => d.status === 'review').length, 0)
  validateReferences(demo)
  const changed = structuredClone(original)
  changed.purchases.find(d => d.id === discardedPurchases[0].id).status = 'completed'
  assert.throws(() => buildDemoDatabase(changed))
  assert.equal(loadEnv('demo', process.cwd(), 'VITE_').VITE_API_BASE_URL, 'http://localhost:3001')
})

test('Coca Cola, Leche and waza trade normally on a disposable copy of the clean demo', async () => {
  const original = await readFile('tests/fixtures/legacy-db.json', 'utf8')
  const clean = JSON.stringify(buildDemoDatabase(JSON.parse(original)))
  const dir = await mkdtemp(join(tmpdir(), 'bodego-clean-demo-'))
  const target = join(dir, 'db.json')
  await writeFile(target, clean)
  const app = jsonServer.create()
  app.use(jsonServer.bodyParser); app.use(jsonServer.router(target))
  const http = app.listen(0, '127.0.0.1')
  await new Promise(resolve => http.once('listening', resolve))
  const vite = await createServer({ mode: 'demo', server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' })
  const load = path => vite.ssrLoadModule('/src/' + path)
  const storage = new Map()
  globalThis.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) }
  try {
    const { api } = await load('shared/infrastructure/http-client.js')
    assert.equal(api.defaults.baseURL, 'http://localhost:3001')
    api.defaults.baseURL = `http://127.0.0.1:${http.address().port}`
    setActivePinia(createPinia())
    const { useAuthStore } = await load('iam/application/auth.js')
    const { useProductsStore } = await load('inventory/application/products.js')
    const { useCommercialStore } = await load('commercial/application/commercial.js')
    const { commercialReferences } = await load('commercial/application/product-history.js')
    const { isTerminal } = await load('commercial/domain/commercial-status.js')
    const auth = useAuthStore(), products = useProductsStore(), commercial = useCommercialStore()
    assert.equal(await auth.login('admin@bodego.com', '1234'), true)
    assert.ok((await commercialReferences()).every(entry => isTerminal(entry.document)))
    async function cart(kind) {
      await products.loadProducts()
      return ['1','2','7'].map(id => {
        const p = products.products.find(p => String(p.id) === id)
        return { productId: id, quantity: '1', unitAmount: String(kind === 'sale' ? p.price : '1.25'), expectedStock: p.stock }
      })
    }
    const purchase = await commercial.register('purchase', await cart('purchase'))
    assert.equal(purchase.status, 'completed'); assert.equal(purchase.totalMinor, 375)
    assert.equal(await auth.login('empleado@bodego.com', '1234'), true)
    assert.equal(auth.can('products.create'), false)
    const sale = await commercial.register('sale', await cart('sale'))
    assert.equal(sale.status, 'completed'); assert.equal(sale.totalMinor, 930)
    const persisted = JSON.parse(await readFile(target, 'utf8'))
    for (const document of [purchase, sale]) for (const line of document.lines) {
      const movement = persisted.operations.find(o => o.sourceId === document.id && o.sourceLineId === line.id)
      assert.equal(movement.id, line.movementId)
      assert.equal(line.stockAfter, line.stockBefore + (document === purchase ? 1 : -1))
    }
    assert.deepEqual(persisted.products, JSON.parse(clean).products)
    validateReferences(persisted)
    assert.deepEqual(jsonServer.router(target).db.getState(), persisted)
    await commercial.load('purchase')
    assert.ok([...commercial.purchases, ...commercial.sales].every(isTerminal))
    assert.equal(storage.get('bodego-commercial-pending-v1'), '[]')
    assert.equal(await readFile('tests/fixtures/legacy-db.json', 'utf8'), original)
    assert.deepEqual(buildDemoDatabase(JSON.parse(original)), JSON.parse(clean))
  } finally {
    await vite.close(); await new Promise(resolve => http.close(resolve))
    await rm(target); await rmdir(dir); delete globalThis.localStorage
  }
})

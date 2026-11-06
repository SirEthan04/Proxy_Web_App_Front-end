import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdtemp, rm, rmdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import jsonServer from 'json-server'
import axios from 'axios'
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'

test('commercial reliability against isolated JSON Server and injected response failures', async () => {
  const original = await readFile('tests/fixtures/legacy-db.json', 'utf8')
  const dir = await mkdtemp(join(tmpdir(), 'bodego-reliability-'))
  const target = join(dir, 'db.json')
  await writeFile(target, original)
  const app = jsonServer.create()
  app.use(jsonServer.bodyParser); app.use(jsonServer.router(target))
  const http = app.listen(0, '127.0.0.1')
  await new Promise(resolve => http.once('listening', resolve))
  const vite = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' })
  const load = path => vite.ssrLoadModule('/src/' + path)
  const storage = new Map()
  let failCleanup = false
  globalThis.localStorage = {
    getItem: k => storage.get(k) ?? null,
    setItem: (k, v) => {
      if (failCleanup && k === 'bodego-commercial-pending-v1' && v === '[]') throw Error('Browser cleanup unavailable')
      storage.set(k, v)
    }, removeItem: k => storage.delete(k)
  }
  try {
    const { api } = await load('shared/infrastructure/http-client.js')
    api.defaults.baseURL = `http://127.0.0.1:${http.address().port}`
    const actual = axios.getAdapter(api.defaults.adapter)
    const calls = []
    let mode = 'normal'
    const reverse = value => Array.isArray(value) ? value.map(reverse) : value && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).reverse().map(([k,v]) => [k, reverse(v)])) : value
    api.defaults.adapter = async config => {
      calls.push([config.method, config.url])
      if (mode === 'offline' && config.method === 'get') throw Object.assign(Error('Disconnected before write'), { code: 'ECONNREFUSED' })
      if (mode === 'bad-stock' && config.method === 'put' && config.url.startsWith('/products/')) {
        return { data: { ...JSON.parse(config.data), stock: 999 }, status: 200, headers: {}, config }
      }
      const response = await actual(config)
      if (mode === 'lost-movement' && config.method === 'post' && config.url === '/operations') throw Object.assign(Error('Response lost after persistence'), { code: 'ETIMEDOUT' })
      if (mode === 'reorder' && ['post','put'].includes(config.method)) response.data = JSON.stringify(reverse(JSON.parse(response.data)))
      return response
    }
    setActivePinia(createPinia())
    const { useAuthStore } = await load('iam/application/auth.js')
    const { useProductsStore } = await load('inventory/application/products.js')
    const { useCommercialStore } = await load('commercial/application/commercial.js')
    const { commercialReferences } = await load('commercial/application/product-history.js')
    const auth = useAuthStore(), products = useProductsStore(), commercial = useCommercialStore()
    auth.user = { name: 'Isolated admin', role: 'Administrador', email: 'test@example.invalid' }
    const makeProduct = name => products.addProduct({ name, category: 'Hogar', price: 2, stock: 10, expirationDate: '2030-12-31' })
    const first = await makeProduct('Isolated one'), second = await makeProduct('Isolated two')
    async function cart(ids) {
      await products.loadProducts()
      return ids.map(id => { const p = products.products.find(p => String(p.id) === String(id)); return { productId: String(id), productName: p.name, quantity: '1', unitAmount: '2', expectedStock: p.stock } })
    }
    // No submitted command means canceling the confirmation cannot write data.
    const cancelSnapshot = await readFile(target, 'utf8')
    await cart([first.id])
    assert.equal(await readFile(target, 'utf8'), cancelSnapshot)
    for (const kind of ['purchase','sale']) for (const ids of [[first.id], [first.id, second.id]]) {
      mode = 'reorder'
      const document = await commercial.register(kind, await cart(ids))
      assert.equal(document.status, 'completed')
      const persisted = JSON.parse(await readFile(target, 'utf8'))
      for (const line of document.lines) {
        const product = persisted.products.find(p => String(p.id) === line.productId)
        assert.equal(product.stock, line.stockBefore + (kind === 'purchase' ? 1 : -1))
        const matches = persisted.operations.filter(o => o.sourceId === document.id && o.sourceLineId === line.id)
        assert.equal(matches.length, 1); assert.equal(matches[0].id, line.movementId)
      }
    }
    mode = 'normal'
    auth.user = { name: 'Isolated employee', role: 'Empleado', email: 'employee@example.invalid' }
    const doubleCart = await cart([first.id])
    const firstPress = commercial.register('purchase', doubleCart)
    await assert.rejects(commercial.register('purchase', doubleCart), e => e.messageKey === 'requestInProgress')
    await firstPress
    // Completed remote write must survive a browser journal cleanup failure.
    failCleanup = true
    const completed = await commercial.register('sale', await cart([first.id]))
    assert.equal(completed.status, 'completed')
    const stored = JSON.parse(await readFile(target, 'utf8')).sales.find(d => d.id === completed.id)
    assert.equal(stored.status, 'completed')
    const journal = storage.get('bodego-commercial-pending-v1')
    assert.ok(journal.includes(completed.id))
    await commercialReferences()
    assert.equal(storage.get('bodego-commercial-pending-v1'), journal)
    failCleanup = false
    // A genuinely unresolved local version is preserved even if the remote
    // document is terminal. Reading cannot silently erase the disagreement.
    const unresolved = structuredClone(completed)
    unresolved.status = 'review'; unresolved.completedAt = null
    unresolved.lines[0].phase = 'stock_attempted'
    storage.set('bodego-commercial-pending-v1', JSON.stringify([{ kind: 'sale', document: unresolved }]))
    const preserved = storage.get('bodego-commercial-pending-v1')
    const references = await commercialReferences()
    const conflict = references.find(r => r.document.id === completed.id)
    assert.equal(conflict.document.status, 'review')
    assert.equal(conflict.serverStatus, 'completed')
    assert.equal(storage.get('bodego-commercial-pending-v1'), preserved)
    storage.set('bodego-commercial-pending-v1', journal)
    const preflightCart = await cart([second.id])
    const before = await readFile(target, 'utf8'), beforeJournal = storage.get('bodego-commercial-pending-v1')
    const callStart = calls.length
    mode = 'offline'
    await assert.rejects(commercial.register('purchase', preflightCart), e => e.messageKey === 'commercialBeforeWriteFailed')
    assert.equal(commercial.activeDocumentId, null)
    assert.equal(await readFile(target, 'utf8'), before)
    assert.equal(storage.get('bodego-commercial-pending-v1'), beforeJournal)
    assert.ok(calls.slice(callStart).every(([method]) => method === 'get'))
    mode = 'normal'
    const lostCart = await cart([second.id])
    mode = 'lost-movement'
    await assert.rejects(commercial.register('purchase', lostCart), e => e.messageKey === 'commercialWriteUncertain')
    const partial = JSON.parse(await readFile(target, 'utf8'))
    const uncertain = partial.purchases.find(d => d.id === commercial.activeDocumentId)
    assert.equal(uncertain.status, 'review')
    assert.equal(uncertain.lines[0].phase, 'movement_attempted')
    assert.equal(partial.operations.filter(o => o.sourceId === uncertain.id).length, 1)
    assert.equal(calls.filter(([method, url]) => method === 'post' && url === '/operations').length, partial.operations.length - JSON.parse(original).operations.length)
    mode = 'normal'
    await assert.rejects(commercial.register('purchase', await cart([second.id])), e => e.messageKey === 'commercialProductBlocked')
    auth.user.role = 'Administrador'
    const third = await makeProduct('Isolated invalid echo')
    const thirdCart = await cart([third.id])
    mode = 'bad-stock'
    await assert.rejects(commercial.register('purchase', thirdCart), e => e.messageKey === 'commercialWriteUncertain')
    const bad = JSON.parse(await readFile(target, 'utf8')).purchases.find(d => d.id === commercial.activeDocumentId)
    assert.equal(bad.status, 'review'); assert.equal(bad.lines[0].movementId, null)
    assert.equal(await readFile('tests/fixtures/legacy-db.json', 'utf8'), original)
  } finally {
    await vite.close(); await new Promise(resolve => http.close(resolve))
    await rm(target); await rmdir(dir); delete globalThis.localStorage
  }
})

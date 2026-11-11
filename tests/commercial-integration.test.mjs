import { test, beforeEach } from 'node:test'
import { acceptToken, acceptUser, clearSession } from '../src/iam/infrastructure/session.js'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import { commercialWorkflow } from '../src/commercial/application/backend-workflow.js'
import { createPayload, adaptDocument } from '../src/commercial/domain/backend-commercial.js'

// Replace only Vite's env expression in memory; Axios never uses the network.
registerHooks({ load(url, context, nextLoad) {
  const result = nextLoad(url, context)
  if (url.endsWith('/http-client.js') || url.endsWith('/inventory-api.js')) {
    return { ...result, source: readFileSync(new URL(url), 'utf8').replaceAll('import.meta.env', "({ VITE_API_BASE_URL: 'http://localhost:5281' })") }
  }
  return result
} })
const { inventoryApi } = await import('../src/inventory/infrastructure/inventory-api.js')
const api = await import('../src/commercial/infrastructure/real-commercial-api.js')
const { createPinia, setActivePinia } = await import('pinia')
const { useAuthStore } = await import('../src/iam/application/auth.js')
const { useProductsStore } = await import('../src/inventory/application/inventory.js')
const { useCommercialStore, IAM_BLOCK } = await import('../src/commercial/application/real-commercial.js')
// GUID fixtures exist only in this controlled mock suite, never in production.
const userId = '11111111-1111-4111-8111-111111111111'
const productId = '22222222-2222-4222-8222-222222222222'
const lotId = '33333333-3333-4333-8333-333333333333'
const documentId = '44444444-4444-4444-8444-444444444444'
const itemId = '55555555-5555-4555-8555-555555555555'
const products = [{ id: productId, active: true, name: 'Producto de prueba aislada', price: 2.5, stock: 8 }]
const lines = [{ productId, quantity: '2', unitAmount: '2,50', lotId: '' }]
const draft = { id: documentId, userId, registeredAt: '2026-11-10T12:00:00Z', status: 'Draft', total: 5, items: [{ id: itemId, productId, lotId: null, quantity: 2, unitAmount: 2.5, subtotal: 5 }] }
const confirmed = { ...draft, status: 'Confirmed' }
beforeEach(() => { clearSession(); acceptToken({ accessToken: 'mock-token', tokenType: 'Bearer', expiresAt: new Date(Date.now() + 60000).toISOString() }); acceptUser({ id: userId, name: 'Fixture', email: 'fixture@example.invalid', roleId: 1, role: 'Administrador' }) })
const reply = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })

test('both kinds use exact REST methods and the real API base', async () => {
  const requests = []
  inventoryApi.defaults.adapter = async config => { requests.push(config); return reply(config, draft) }
  for (const [kind, endpoint] of [['purchase', '/purchases'], ['sale', '/sales']]) {
    requests.length = 0
    await api.getDocuments(kind)
    await api.getDocument(kind, documentId)
    await api.createDocument(kind, createPayload(lines, products, {}))
    await api.confirmDocument(kind, documentId)
    assert.deepEqual(requests.map(r => [r.method, r.url]), [['get', endpoint], ['get', `${endpoint}/${documentId}`], ['post', endpoint], ['post', `${endpoint}/${documentId}/confirm`]])
    assert.ok(requests.every(r => r.baseURL === 'http://localhost:5281/api/v1'))
    assert.deepEqual(JSON.parse(requests[2].data), { items: [{ productId, lotId: null, quantity: 2, unitAmount: 2.5 }] })
  }
  await api.getLots(productId)
  assert.equal(requests.at(-1).url, `/products/${productId}/lots`)
})

test('payload preserves GUID and rejects invalid quantity, amount, product and lot', () => {
  for (const quantity of ['0', '-1', '1.5', '2147483648', '', null]) assert.throws(() => createPayload([{ ...lines[0], quantity }], products, {}))
  for (const unitAmount of ['-1', '1.001', '10000000000']) assert.throws(() => createPayload([{ ...lines[0], unitAmount }], products, {}))
  assert.throws(() => createPayload(lines, [], {}))

  assert.throws(() => createPayload([{ ...lines[0], lotId }], products, {}))
  assert.equal(createPayload([{ ...lines[0], lotId }], products, { [productId]: [{ id: lotId, productId }] }).items[0].lotId, lotId)
  const result = adaptDocument(draft, products)
  assert.equal(result.id, documentId)
  assert.equal(result.lines[0].id, itemId)
  assert.equal(result.status, 'Draft')
  assert.equal(result.totalMinor, 500)
})

for (const kind of ['purchase', 'sale']) {
  test(`${kind}: Draft never confirms or refreshes stock; confirmation refreshes once`, async () => {
    const calls = []
    const mock = {
      createDocument: async (k, body) => { calls.push(['create', k, body]); return { data: draft } },
      getDocument: async () => { calls.push(['get']); return { data: draft } },
      confirmDocument: async () => { calls.push(['confirm']); return { data: confirmed } }
    }
    const workflow = commercialWorkflow({ api: mock, resolveUser: async () => userId, refresh: async () => { calls.push(['refresh']) } })
    assert.equal((await workflow.create(kind, id => createPayload(lines, products, {}))).status, 'Draft')
    assert.deepEqual(calls.map(c => c[0]), ['create'])
    assert.equal(products[0].stock, 8)
    calls.length = 0
    assert.equal((await workflow.confirm(kind, documentId)).document.status, 'Confirmed')
    assert.deepEqual(calls.map(c => c[0]), ['get', 'confirm', 'refresh'])
    assert.equal(products[0].stock, 8) // Never apply a local stock delta.
  })
}

test('already Confirmed and 409 never trigger duplicate confirmation or automatic retries', async () => {
  let posts = 0
  const conflict = Object.assign(new Error('Conflict'), { response: { status: 409, data: { title: 'Stock insuficiente del producto o lote para confirmar la venta.' } } })
  const mock = { getDocument: async () => ({ data: confirmed }), confirmDocument: async () => { posts++; throw conflict } }
  const workflow = commercialWorkflow({ api: mock, resolveUser: async () => userId, refresh: async () => assert.fail('Unexpected refresh') })
  await assert.rejects(workflow.confirm('sale', documentId), /ya no es un borrador/)
  assert.equal(posts, 0)
  mock.getDocument = async () => ({ data: draft })
  await assert.rejects(workflow.confirm('sale', documentId), error => error === conflict)
  assert.equal(posts, 1)
  assert.match(api.commercialError(conflict), /Stock insuficiente/)
})

test('refresh failure preserves authoritative confirmation and reports a warning', async () => {
  const failure = new Error('Offline')
  const workflow = commercialWorkflow({ api: { getDocument: async () => ({ data: draft }), confirmDocument: async () => ({ data: confirmed }) }, resolveUser: async () => userId, refresh: async () => { throw failure } })
  const result = await workflow.confirm('purchase', documentId)
  assert.equal(result.document.status, 'Confirmed')
  assert.equal(result.refreshError, failure)
})

test('real store reads real documents; demo IAM cannot create or confirm even with a GUID', async () => {
  setActivePinia(createPinia())

  const requests = []
  inventoryApi.defaults.adapter = async config => {
    requests.push(config)
    assert.equal(config.method, 'get', 'No write may escape the identity gate')
    const data = config.url === '/categories' ? [] : config.url === '/products' ? products : config.url === '/products/low-stock' ? [] : config.url.endsWith(documentId) ? draft : [draft]
    return reply(config, data)
  }
  const store = useCommercialStore()
  await store.load('purchase')
  assert.equal(store.purchases[0].id, documentId)
  assert.equal(store.purchases[0].lines[0].productName, products[0].name)
  clearSession()
  await assert.rejects(store.register('sale', lines), /sesión/)
  await assert.rejects(store.confirm('purchase', documentId), /sesión/)
  assert.equal(store.submitting, false)
  assert.ok(requests.every(r => r.method === 'get'))
  assert.equal(useProductsStore().products[0].stock, 8)
})

test('error messages cover validation, missing resources, conflicts and server failures', () => {
  for (const status of [400, 404, 409, 500, 503]) assert.ok(api.commercialError({ response: { status, data: {} } }).length > 20)
  assert.match(api.commercialError({ isAxiosError: true }, true), /resultado es incierto/)
})

test('store confirmation prevents double clicks and reloads authoritative stock and list', async () => {
  setActivePinia(createPinia())

  const store = useCommercialStore()
  useProductsStore().products = products.map(p => ({ ...p }))
  store.lots = { [productId]: [{ id: lotId }] }
  let release, posts = 0
  const gate = new Promise(resolve => { release = resolve })
  inventoryApi.defaults.adapter = async config => {
    if (config.method === 'post') { posts++; await gate; return reply(config, confirmed) }
    if (config.url === '/categories' || config.url === '/products/low-stock') return reply(config, [])
    if (config.url === '/products') return reply(config, [{ ...products[0], stock: 10 }])
    return reply(config, config.url.endsWith(documentId) ? draft : [confirmed])
  }
  // Only this isolated mock replaces the production IAM blocker.
  const realWorkflow = store.workflow.bind(store)
  store.workflow = () => {
    const workflow = realWorkflow()
    const unblocked = commercialWorkflow({ api, resolveUser: async () => userId, refresh: async kind => { store.lots = {}; await store.load(kind) } })
    return { ...workflow, confirm: unblocked.confirm }
  }
  const first = store.confirm('purchase', documentId)
  await assert.rejects(store.confirm('purchase', documentId), /en curso/)
  release()
  await first
  assert.equal(posts, 1)
  assert.equal(store.submitting, false)
  assert.equal(store.purchases[0].status, 'Confirmed')
  assert.equal(useProductsStore().products[0].stock, 10)
  assert.deepEqual(store.lots, {})
})

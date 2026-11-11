import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createPinia, setActivePinia } from 'pinia'
import { AxiosError } from 'axios'
import { queryApi } from '../src/shared/infrastructure/query-client.js'
import { inventoryApi } from '../src/inventory/infrastructure/inventory-api.js'
import { adaptMovements, adaptWastes, adaptCount } from '../src/operations/infrastructure/real-operations.assembler.js'
import { createRealWaste, createInventoryCount, operationsError } from '../src/operations/infrastructure/real-operations-api.js'
import { useRealOperationsStore, loadRealLots } from '../src/operations/application/real-operations.js'
import { prepareWaste, prepareCount, integerQuantity, WRITE_BLOCKED } from '../src/operations/domain/real-operations.js'

// Isolated fixtures: never sent to a real API.
const productId = '10000000-0000-4000-8000-000000000001'
const lotId = '10000000-0000-4000-8000-000000000002'
const id = '10000000-0000-4000-8000-000000000003'
const userId = '10000000-0000-4000-8000-000000000004'
const products = [{ id: productId, name: 'Fixture', active: true, stock: 5 }]
const lots = [{ id: lotId, productId, lotCode: 'Fixture', quantityAvailable: 5, expirationDate: null, receivedAt: '2026-11-11T00:00:00' }]
const movement = { id, productId, lotId, userId, movementType: 'Waste', quantityDelta: -2, sourceType: 'Waste', sourceId: id, createdAt: '2026-11-11T12:00:00' }
const waste = { id, productId, lotId, userId, quantity: 2, reason: 'Fixture', registeredAt: '2026-11-11T12:00:00' }
const count = { id, userId, countedAt: '2026-11-11T12:00:00', status: 'Confirmed', notes: null, items: [{ id, productId, lotId, expectedQuantity: 5, countedQuantity: 2, difference: -3 }] }
let requests
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
beforeEach(() => { setActivePinia(createPinia()); requests = [] })

test('movimientos conservan GUID, delta con signo, origen y fecha exactos', () => {
  assert.deepEqual(adaptMovements([movement]), [movement])
  assert.throws(() => adaptMovements([{ ...movement, quantityDelta: '2' }]))
  assert.throws(() => adaptMovements({ items: [] }))
})
test('mermas y conteos adaptan sus contratos y detalles sin inventar identificadores', () => {
  assert.deepEqual(adaptWastes([waste]), [waste])
  assert.deepEqual(adaptCount(count), count)
  assert.throws(() => adaptWastes([{ ...waste, quantity: 0 }]))
  assert.throws(() => adaptCount({ ...count, items: [{ ...count.items[0], difference: 3 }] }))
})
test('listas vacías válidas no generan movimientos, mermas ni errores falsos', async () => {
  queryApi.defaults.adapter = async config => { requests.push(config); return response(config, []) }
  const store = useRealOperationsStore()
  await store.loadMovements(); await store.loadWastes()
  assert.deepEqual(store.movements, []); assert.deepEqual(store.wastes, [])
  assert.equal(store.movementsError, null); assert.equal(store.wastesError, null)
  assert.deepEqual(requests.map(r => [r.method, r.url]), [['get', '/inventory-movements'], ['get', '/wastes']])
})
test('consulta conteo por GUID y rechaza identificadores inválidos antes del HTTP', async () => {
  queryApi.defaults.adapter = async config => { requests.push(config); return response(config, count) }
  const store = useRealOperationsStore()
  await store.loadCount(id)
  assert.deepEqual(store.count, count)
  assert.equal(requests[0].url, '/inventory-counts/' + id)
  await store.loadCount('inventado')
  assert.equal(store.count, null); assert.match(store.countError, /GUID/)
  assert.equal(requests.length, 1)
})
test('cantidades enteras según int32, merma positiva y conteo permite cero', () => {
  assert.equal(integerQuantity('0'), 0)
  assert.equal(integerQuantity('2147483647'), 2147483647)
  for (const v of ['', ' ', null, true, -1, 1.2, '1e2', 2147483648]) assert.throws(() => integerQuantity(v))
  assert.throws(() => integerQuantity(0, 1))
})
test('borrador de merma usa referencias reales y detecta stock insuficiente o inconsistente', () => {
  const draft = { productId, lotId, quantity: '2', reason: ' Merma ' }
  assert.deepEqual(prepareWaste(draft, products, lots), { productId, lotId, quantity: 2, reason: 'Merma' })
  assert.throws(() => prepareWaste({ ...draft, quantity: 6 }, products, lots), /Stock insuficiente/)
  assert.throws(() => prepareWaste(draft, [{ ...products[0], stock: 6 }], lots), /inconsistentes/)
  assert.throws(() => prepareWaste(draft, products, []), /lote/)
  assert.throws(() => prepareWaste(draft, [], lots), /producto real/)
  assert.throws(() => prepareWaste(draft, [{ ...products[0], active: false }], lots), /inactivo/)
  assert.throws(() => prepareWaste({ ...draft, reason: 'x'.repeat(256) }, products, lots), /255/)
  assert.equal(products[0].stock, 5); assert.equal(lots[0].quantityAvailable, 5)
})
test('conteos admiten diferencias sin ajustar stock y rechazan duplicados y total mezclado con lote', () => {
  const item = { productId, lotId, countedQuantity: '0' }
  assert.deepEqual(prepareCount({ items: [item] }, products, lots), { notes: null, items: [{ ...item, countedQuantity: 0 }] })
  assert.throws(() => prepareCount({ items: [item, item] }, products, lots), /repitas/)
  assert.throws(() => prepareCount({ items: [item, { ...item, lotId: null }] }, products, lots), /mezcles/)
  assert.throws(() => prepareCount({ items: [] }, products, lots), /detalle/)
  assert.throws(() => prepareCount({ items: [item], notes: 'x'.repeat(501) }, products, lots), /500/)
  assert.equal(products[0].stock, 5)
})
test('errores HTTP 400/404/409/500 y conexión limpian datos anteriores', async () => {
  const store = useRealOperationsStore()
  for (const status of [400, 404, 409, 500, null]) {
    store.movements = [movement]; store.wastes = [waste]; store.count = count
    const error = new AxiosError('Failure', 'ERR_BAD_RESPONSE', {}, null, status ? { status } : undefined)
    queryApi.defaults.adapter = async () => { throw error }
    await store.loadMovements(); await store.loadWastes(); await store.loadCount(id)
    assert.deepEqual(store.movements, []); assert.deepEqual(store.wastes, []); assert.equal(store.count, null)
    assert.equal(store.movementsError, operationsError(error)); assert.equal(store.wastesError, store.movementsError); assert.equal(store.countError, store.movementsError)
  }
  assert.match(operationsError({ response: { status: 409 } }), /stock insuficiente/)
})
test('guardas de escritura no se eluden con userId o doble clic; ningún HTTP ni ajuste local', async () => {
  queryApi.defaults.adapter = inventoryApi.defaults.adapter = async config => { requests.push(config); throw new Error('HTTP no permitido') }
  const store = useRealOperationsStore()
  for (const fn of [() => createRealWaste({ userId }), () => createInventoryCount({ userId }), () => store.registerWaste({ userId }), () => store.registerCount({ userId })]) {
    const results = await Promise.allSettled([fn(), fn()])
    assert.ok(results.every(r => r.status === 'rejected' && r.reason.message === WRITE_BLOCKED))
  }
  assert.equal(requests.length, 0)
})
test('lotes reutilizan el cliente Inventory y las pantallas el store real, sin stock legacy', async () => {
  inventoryApi.defaults.adapter = async config => { requests.push(config); return response(config, lots) }
  assert.deepEqual(await loadRealLots(productId), lots)
  assert.equal(requests[0].url, '/products/' + productId + '/lots'); assert.equal(requests[0].method, 'get')
  for (const path of ['Operations.vue', 'Waste.vue', 'components/PreparedOperationForm.vue']) {
    const text = await readFile(new URL('../src/operations/presentation/' + path, import.meta.url), 'utf8')
    assert.match(text, /inventory\/application\/inventory\.js/)
    assert.doesNotMatch(text, /inventory\/application\/products\.js|updateProduct|registerOperation/)
  }
})
test('doble recarga de movimientos no duplica solicitudes ni filas', async () => {
  let release
  queryApi.defaults.adapter = config => { requests.push(config); return new Promise(resolve => { release = () => resolve(response(config, [movement])) }) }
  const store = useRealOperationsStore()
  const first = store.loadMovements(), second = store.loadMovements()
  release(); await Promise.all([first, second])
  assert.equal(requests.length, 1); assert.deepEqual(store.movements, [movement])
})

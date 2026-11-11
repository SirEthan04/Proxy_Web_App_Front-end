import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { AxiosError } from 'axios'
import { queryApi, queryError } from '../src/shared/infrastructure/query-client.js'
import { adaptAlert, adaptAlerts } from '../src/monitoring/infrastructure/alerts.assembler.js'
import { useAlertsStore } from '../src/monitoring/application/alerts.js'
import { useReportsStore } from '../src/reporting/application/reports.js'
import { reportParams, adaptSummary, adaptTopProducts } from '../src/reporting/domain/report-contract.js'

// Isolated fixtures; these are never sent to the backend or persisted.
const id = '733d76bd-b8f4-48c6-8fd0-4d81e34d0653'
const alert = { id, productId: id, lotId: null, attendedByUserId: null, alertType: 'LowStock', status: 'Pending', message: 'Stock bajo', createdAt: '2026-11-11T12:00:00', attendedAt: null }
let requests
function respond(resolve) {
  queryApi.defaults.adapter = async config => {
    requests.push(config)
    return { data: resolve(config), status: 200, statusText: 'OK', headers: {}, config }
  }
}
beforeEach(() => { setActivePinia(createPinia()); requests = [] })

test('adapta alertas sin cambiar GUID, estados ni fechas; rechaza respuestas inválidas', () => {
  assert.deepEqual(adaptAlert(alert), alert)
  assert.deepEqual(adaptAlerts([]), [])
  assert.throws(() => adaptAlerts({ items: [] }))
  assert.throws(() => adaptAlert({}))
})
test('Monitoring vacío es válido y detalle consulta su GUID mediante GET', async () => {
  respond(c => c.url === '/alerts' ? [] : alert)
  const store = useAlertsStore()
  await store.loadAlerts()
  assert.deepEqual(store.alerts, [])
  assert.equal(store.loadError, null)
  await store.loadDetail(id)
  assert.equal(store.detail.id, id)
  assert.deepEqual(requests.map(r => r.url), ['/alerts', '/alerts/' + id])
  assert.ok(requests.every(r => r.method === 'get'))
})
test('resumen conserva ceros reales; top-products conserva unidades y GUID', () => {
  assert.deepEqual(adaptSummary({ salesCount: 0, totalAmount: 0 }), { salesCount: 0, totalAmount: 0 })
  const rows = [{ productId: id, productName: 'Producto de fixture', quantitySold: 7 }]
  assert.deepEqual(adaptTopProducts(rows), rows)
  assert.deepEqual(adaptTopProducts([]), [])
  assert.throws(() => adaptSummary({}))
  assert.throws(() => adaptTopProducts([{ productId: 1 }]))
})
test('fechas inclusivas sin conversión horaria, límites 1–100 y fechas opcionales', () => {
  assert.deepEqual(reportParams({ from: '2024-02-29', to: '2024-02-29', limit: '100' }), { from: '2024-02-29', to: '2024-02-29', limit: 100 })
  assert.deepEqual(reportParams(), { limit: 10 })
  assert.equal(reportParams({ from: '1000-01-01', to: '9999-12-31', limit: 1 }).limit, 1)
  for (const from of ['2025-02-29', '2026-04-31', '0999-12-31', '11/11/2026', '2026-11-11T00:00:00Z']) assert.throws(() => reportParams({ from }))
  assert.throws(() => reportParams({ from: '2026-11-12', to: '2026-11-11' }))
  for (const limit of [0, 101, -1, 1.5, '', 'abc', null]) assert.throws(() => reportParams({ limit }))
})
test('Reporting realiza únicamente GET con filtros exactos y no agrega datos ficticios', async () => {
  respond(c => c.url.endsWith('sales-summary') ? { salesCount: 0, totalAmount: 0 } : [])
  const store = useReportsStore()
  await store.loadReports({ from: '2026-11-01', to: '2026-11-11', limit: 5 })
  assert.deepEqual(store.summary, { salesCount: 0, totalAmount: 0 })
  assert.deepEqual(store.topProducts, [])
  assert.equal(store.loadError, null)
  assert.deepEqual(requests.map(r => [r.method, r.url, r.params]), [
    ['get', '/reports/sales-summary', { from: '2026-11-01', to: '2026-11-11' }],
    ['get', '/reports/top-products', { from: '2026-11-01', to: '2026-11-11', limit: 5 }]
  ])
  await store.loadReports({ limit: 101 })
  assert.equal(requests.length, 2)
  assert.equal(store.summary, null)
  assert.deepEqual(store.topProducts, [])
  assert.match(store.loadError, /1 y 100/)
})
test('errores HTTP y conexión tienen mensajes españoles y eliminan resultados anteriores', async () => {
  for (const status of [400, 404, 500]) assert.ok(queryError({ response: { status } }).length > 15)
  assert.match(queryError(new AxiosError('Network Error')), /conectar/)
  const reports = useReportsStore(), alerts = useAlertsStore()
  respond(c => c.url === '/alerts' ? [alert] : c.url.endsWith('sales-summary') ? { salesCount: 2, totalAmount: 12 } : [])
  await reports.loadReports(); await alerts.loadAlerts(); await alerts.loadDetail(id)
  queryApi.defaults.adapter = async () => { throw new AxiosError('Network Error') }
  await reports.loadReports(); await alerts.loadAlerts(); await alerts.loadDetail(id)
  assert.equal(reports.summary, null)
  assert.deepEqual(reports.topProducts, [])
  assert.deepEqual(alerts.alerts, [])
  assert.equal(alerts.detail, null)
  assert.match(reports.loadError, /conectar/)
  assert.match(alerts.loadError, /conectar/)
  assert.match(alerts.detailError, /conectar/)
})
test('HTTP 400, 404 y 500 dejan los stores sin datos ni falso éxito', async () => {
  for (const status of [400, 404, 500]) {
    queryApi.defaults.adapter = async config => { throw new AxiosError('HTTP', 'ERR_BAD_RESPONSE', config, null, { status }) }
    const alerts = useAlertsStore(), reports = useReportsStore()
    await alerts.loadAlerts(); await alerts.loadDetail(id); await reports.loadReports()
    assert.equal(alerts.loadError, queryError({ response: { status } }))
    assert.equal(alerts.detailError, alerts.loadError)
    assert.equal(reports.loadError, alerts.loadError)
    assert.equal(reports.summary, null)
    assert.equal(reports.appliedFilters, null)
  }
})

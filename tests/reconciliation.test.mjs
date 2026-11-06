import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'
import { pendingEvidence } from '../src/commercial/domain/reconciliation.js'

const file = await readFile('tests/fixtures/legacy-db.json', 'utf8')
const db = JSON.parse(file)
// Only an in-memory fixture: the browser-only operation is not persisted as fact.
const waza = structuredClone(db.purchases[0])
waza.id = '57554593-39ac-4f57-b743-bdd66babae74'
Object.assign(waza.lines[0], { productId: '7', productName: 'waza', stockBefore: 12, stockAfter: 13 })
const evidence = { ...db, local: [{ kind: 'purchase', document: waza }] }

test('three pending cases, current stock distinct from trace, no inference and no mutation', () => {
  const before = JSON.stringify(evidence)
  const rows = pendingEvidence(evidence)
  assert.equal(rows.length, 3)
  const local = rows.find(row => row.id === waza.id)
  assert.equal(local.snapshots[0].source, 'local')
  const line = local.snapshots[0].lines[0]
  assert.equal(line.currentStock, 12)
  assert.equal(line.stockAfter, 13)
  assert.equal(line.movementConfirmed, false)
  assert.equal(line.explanation, 'reviewStockUncertain')
  assert.equal(line.linked.length, 0)
  assert.equal(JSON.stringify(evidence), before)
})

test('source disagreement survives remote completion; movement requires exact unique references', () => {
  const completed = structuredClone(db.purchases.find(d => d.status === 'completed'))
  const local = structuredClone(completed)
  local.status = 'review'; local.completedAt = null; local.lines[0].phase = 'stock_attempted'
  const rows = pendingEvidence({ ...db, local: [{ kind: 'purchase', document: local }] })
  const row = rows.find(r => r.id === completed.id)
  assert.equal(row.discrepancy, true)
  assert.equal(row.snapshots.length, 2)
  assert.equal(row.snapshots[0].lines[0].movementConfirmed, true)
  const duplicate = pendingEvidence({ ...db, local: [{ kind: 'purchase', document: local }], operations: [...db.operations, { ...db.operations[2], id: 999 }] })
  assert.equal(duplicate.find(r => r.id === completed.id).snapshots[0].lines[0].movementConfirmed, false)
  assert.equal(duplicate.find(r => r.id === completed.id).snapshots[0].lines[0].movementConflict, true)
})

test('missing sources and malformed stock never produce confirmation', () => {
  const row = pendingEvidence({ ...evidence, unavailable: ['products', 'operations'] }).find(r => r.id === waza.id)
  assert.equal(row.snapshots[0].lines[0].currentStock, null)
  assert.equal(row.snapshots[0].lines[0].movementConfirmed, false)
  assert.equal(pendingEvidence({ ...evidence, products: [{ id: '7', stock: '' }] }).find(r => r.id === waza.id).snapshots[0].lines[0].currentStock, null)
})

test('application queries are GET-only; journal is not cleaned; permissions and translations', async () => {
  const vite = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' })
  const load = name => vite.ssrLoadModule('/src/' + name)
  const raw = JSON.stringify(evidence.local)
  let journalReads = 0
  globalThis.localStorage = {
    getItem: key => { if (key === 'bodego-commercial-pending-v1') { journalReads++; return raw } return null },
    setItem: () => { throw Error('Forbidden storage write') },
    removeItem: () => { throw Error('Forbidden storage delete') }
  }
  try {
    const { api } = await load('shared/infrastructure/http-client.js')
    const calls = []
    let failedSource = null
    api.defaults.adapter = async config => {
      calls.push(config.url)
      assert.equal(config.method, 'get')
      if (config.url === failedSource) throw Error('Isolated read failure')
      return { data: structuredClone(db[config.url.slice(1)]), status: 200, statusText: 'OK', headers: {}, config }
    }
    setActivePinia(createPinia())
    const { useAuthStore } = await load('iam/application/auth.js')
    const { loadReconciliation } = await load('commercial/application/reconciliation.js')
    const auth = useAuthStore()
    auth.user = { role: 'Empleado' }
    await assert.rejects(loadReconciliation(), error => error.messageKey === 'accessDeniedMessage')
    assert.equal(calls.length, 0)
    assert.equal(journalReads, 0)
    auth.user = { role: 'Administrador' }
    const result = await loadReconciliation()
    assert.equal(result.rows.length, 3)
    assert.equal(journalReads, 1)
    assert.deepEqual(calls.sort(), ['/operations', '/products', '/purchases', '/sales'])
    failedSource = '/products'
    const partial = await loadReconciliation()
    assert.deepEqual(partial.unavailable, ['products'])
    assert.ok(partial.rows.every(row => row.snapshots.every(s => s.lines.every(l => l.currentStock === null))))
    globalThis.localStorage.getItem = () => '{invalid'
    const unreadable = await loadReconciliation()
    assert.ok(unreadable.unavailable.includes('local'))
    const { messages } = await load('i18n.js')
    for (const key of Object.keys(messages.es).filter(k => k.startsWith('review'))) assert.ok(messages.en[key], key)
    assert.equal(await readFile('tests/fixtures/legacy-db.json', 'utf8'), file)
  } finally { await vite.close(); delete globalThis.localStorage }
})

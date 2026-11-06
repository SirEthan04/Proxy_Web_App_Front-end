import { useAuthStore } from '../../iam/application/auth.js'
import { PERMISSIONS } from '../../iam/domain/permissions.js'
import { getDocuments } from '../infrastructure/commercial-api.js'
import { readPending } from '../infrastructure/pending-journal.js'
import { getProducts } from '../../inventory/infrastructure/product-api.js'
import { getOperations } from '../../operations/infrastructure/operation-api.js'
import { pendingEvidence } from '../domain/reconciliation.js'

// Do not use commercialReferences/load: those may clean the browser journal.
export async function loadReconciliation() {
  useAuthStore().requirePermission(PERMISSIONS.REPORTS_READ)
  const names = ['purchases', 'sales', 'products', 'operations', 'local']
  const results = await Promise.allSettled([
    getDocuments('purchase'), getDocuments('sale'),
    getProducts().then(r => { if (!Array.isArray(r.data)) throw Error('Invalid products'); return r.data }),
    getOperations().then(r => { if (!Array.isArray(r.data)) throw Error('Invalid operations'); return r.data }),
    Promise.resolve().then(readPending)
  ])
  const data = { unavailable: [] }
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') data[names[index]] = result.value
    else data.unavailable.push(names[index])
  })
  return { rows: pendingEvidence(data), unavailable: data.unavailable, observedAt: new Date().toISOString() }
}

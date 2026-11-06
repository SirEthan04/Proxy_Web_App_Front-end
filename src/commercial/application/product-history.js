import { getDocuments } from '../infrastructure/commercial-api.js'
import { readPending } from '../infrastructure/pending-journal.js'
import { isTerminal } from '../domain/commercial-status.js'
export async function commercialReferences() {
  try {
    const [purchases, sales] = await Promise.all([getDocuments('purchase'), getDocuments('sale')])
    const remote = [...purchases.map(document => ({ kind: 'purchase', document })), ...sales.map(document => ({ kind: 'sale', document }))]
    const local = readPending()
    for (const entry of local) {
      const found = remote.find(item => item.kind === entry.kind && item.document.id === entry.document.id)
      if (found && isTerminal(found.document) && !isTerminal(entry.document)) {
        found.serverStatus = found.document.status
        found.document = entry.document
        found.sourceConflict = true
      }
      else if (!found) remote.push({ ...entry, localOnly: true })
    }
    return remote
  } catch (cause) { throw Object.assign(new Error('Cannot verify commercial references', { cause }), { messageKey: cause.messageKey || 'commercialVerifyFailed' }) }
}
export async function assertCommercialAvailable(productId, source = null) {
  const references = await commercialReferences()
  const blocked = references.some(({ kind, document }) => !isTerminal(document) && !(source && kind === source.kind && document.id === source.id) && document.lines.some(line => String(line.productId) === String(productId)))
  if (blocked) throw Object.assign(new Error('Product pending review'), { messageKey: 'commercialProductBlocked' })
}
export async function hasCommercialHistory(productId) {
  return (await commercialReferences()).some(({ document }) => document.lines.some(line => String(line.productId) === String(productId)))
}

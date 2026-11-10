import { lineTotal, totalMinor } from './money.js'
export const COMMERCIAL_STATUS = Object.freeze({ PROCESSING: 'processing', COMPLETED: 'completed', FAILED: 'failed', REVIEW: 'review' })
export const isTerminal = document => document.status === 'completed' || document.status === 'failed' && document.lines.every(line => line.phase === 'planned')
// JSON object key order is not part of the HTTP contract; array order still is.
export const sameDocument = (first, second) => {
  const canonical = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item)
  return canonical(first) === canonical(second)
}
const phases = new Set(['planned', 'stock_attempted', 'stock_applied', 'movement_attempted', 'recorded'])
const isoDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
export function validDocument(document) {
  if (!document || typeof document.id !== 'string' || !document.id || !Object.values(COMMERCIAL_STATUS).includes(document.status) || !isoDate(document.createdAt) || document.currency !== 'PEN' || !Array.isArray(document.lines) || !document.lines.length) return false
  const products = new Set(), ids = new Set()
  for (const line of document.lines) {
    if (!line || typeof line.id !== 'string' || !line.id || line.productId === null || line.productId === undefined || !String(line.productId) || products.has(String(line.productId)) || ids.has(line.id)) return false
    products.add(String(line.productId)); ids.add(line.id)
    if (!phases.has(line.phase) || lineTotal(line.quantity, line.unitAmountMinor) === null || line.subtotalMinor !== lineTotal(line.quantity, line.unitAmountMinor)) return false
    if (line.phase === 'recorded' && (line.movementId === null || line.movementId === undefined || !String(line.movementId))) return false
  }
  if (document.totalMinor !== totalMinor(document.lines)) return false
  return document.status !== 'completed' || isoDate(document.completedAt) && document.lines.every(line => line.phase === 'recorded')
}

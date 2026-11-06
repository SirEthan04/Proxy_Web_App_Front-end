import { isTerminal, validDocument } from './commercial-status.js'

const stable = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item)
const stockValue = value => value !== null && value !== undefined && value !== '' && typeof value !== 'boolean' && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null

// Evidence describes snapshots. It never authorizes a write or releases a lock.
export function pendingEvidence({ purchases = [], sales = [], local = [], products = [], operations = [], unavailable = [] }) {
  const groups = new Map()
  const add = (kind, document, source) => {
    const key = kind + ':' + document.id
    if (!groups.has(key)) groups.set(key, { key, kind, id: document.id, snapshots: [] })
    groups.get(key).snapshots.push({ source, document })
  }
  purchases.forEach(d => add('purchase', d, 'server'))
  sales.forEach(d => add('sale', d, 'server'))
  local.forEach(entry => add(entry.kind, entry.document, 'local'))
  return [...groups.values()].filter(group => group.snapshots.some(s => !validDocument(s.document) || !isTerminal(s.document))).map(group => {
    const discrepancy = new Set(group.snapshots.map(s => stable(s.document))).size > 1
    return {
      ...group, discrepancy,
      snapshots: group.snapshots.map(snapshot => ({
        ...snapshot,
        lines: snapshot.document.lines.map(line => {
          const matchingProducts = products.filter(p => String(p.id) === String(line.productId))
          const product = matchingProducts.length === 1 ? matchingProducts[0] : null
          const currentStock = !unavailable.includes('products') && product && product.stock !== null && product.stock !== '' && typeof product.stock !== 'boolean' && Number.isFinite(Number(product.stock)) && Number(product.stock) >= 0 ? Number(product.stock) : null
          const linked = operations.filter(o => (o.sourceType === group.kind && o.sourceId === group.id && o.sourceLineId === line.id) || (line.movementId != null && String(o.id) === String(line.movementId)))
          const exact = linked.filter(o => o.sourceType === group.kind && o.sourceId === group.id && o.sourceLineId === line.id && String(o.productId) === String(line.productId) && o.type === (group.kind === 'purchase' ? 'Entrada' : 'Salida') && Number(o.quantity) === Number(line.quantity) && o.id != null)
          const movementConfirmed = !unavailable.includes('operations') && linked.length === 1 && exact.length === 1 && String(exact[0].id) === String(line.movementId)
          const movementConflict = linked.length > 0 && !movementConfirmed
          return { ...line, stockBefore: stockValue(line.stockBefore), stockAfter: stockValue(line.stockAfter), currentStock, linked, movementConfirmed, movementConflict,
            explanation: movementConflict ? 'reviewMovementConflict' : movementConfirmed ? 'reviewMovementFound' : 'reviewStockUncertain' }
        })
      }))
    }
  })
}

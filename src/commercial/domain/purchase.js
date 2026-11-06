import { toMinor, totalMinor, lineTotal } from './money.js'
// One aggregate owns the immutable commercial snapshot and its processing journal.
export function createPurchase(lines, products, registeredBy, kind = 'purchase') {
  const documentLines = lines.map(line => {
    const product = products.find(item => String(item.id) === String(line.productId))
    const unitAmountMinor = toMinor(kind === 'sale' ? product.price : line.unitAmount)
    const quantity = Number(line.quantity)
    return { id: crypto.randomUUID(), productId: String(product.id), productName: product.name, quantity, unitAmountMinor, subtotalMinor: lineTotal(quantity, unitAmountMinor), stockBefore: Number(product.stock), stockAfter: null, phase: 'planned', movementId: null }
  })
  return { id: crypto.randomUUID(), createdAt: new Date().toISOString(), completedAt: null, currency: 'PEN', status: 'processing', registeredBy: { name: registeredBy.name, email: registeredBy.email, role: registeredBy.role }, lines: documentLines, totalMinor: totalMinor(documentLines) }
}

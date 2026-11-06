import { toMinor, lineTotal, totalMinor } from './money.js'
export function validateCart(kind, lines, products) {
  if (!['purchase', 'sale'].includes(kind) || !Array.isArray(lines) || !lines.length) return 'commercialEmptyCart'
  const seen = new Set()
  for (const line of lines) {
    const id = String(line.productId)
    if (seen.has(id)) return 'commercialDuplicate'
    seen.add(id)
    const product = products.find(item => String(item.id) === id)
    if (!product) return 'productNotFound'
    if (line.quantity === null || line.quantity === undefined || typeof line.quantity === 'boolean' || line.quantity === '' || !Number.isSafeInteger(Number(line.quantity)) || Number(line.quantity) <= 0) return 'commercialQuantityError'
    if (toMinor(kind === 'sale' ? product.price : line.unitAmount) === null || lineTotal(Number(line.quantity), toMinor(kind === 'sale' ? product.price : line.unitAmount)) === null) return 'commercialAmountError'
    if (product.stock === null || product.stock === undefined || typeof product.stock === 'boolean' || product.stock === '' || !Number.isFinite(Number(product.stock)) || Number(product.stock) < 0) return 'invalidProductStock'
    if (kind === 'sale' && Number(line.quantity) > Number(product.stock)) return 'insufficientStock'
  }
  const normalized = lines.map(line => ({ quantity: Number(line.quantity), unitAmountMinor: toMinor(kind === 'sale' ? products.find(p => String(p.id) === String(line.productId)).price : line.unitAmount) }))
  return totalMinor(normalized) === null ? 'commercialAmountError' : null
}
export function catalogChanged(kind, lines, products) {
  return lines.some(line => {
    const product = products.find(item => String(item.id) === String(line.productId))
    return !product || Number(line.expectedStock) !== Number(product.stock) || kind === 'sale' && toMinor(line.unitAmount) !== toMinor(product.price)
  })
}

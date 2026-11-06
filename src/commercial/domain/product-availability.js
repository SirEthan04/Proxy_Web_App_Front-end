import { validateCart } from './commercial-validation.js'

// Reuse definitive cart rules to explain why the first unit cannot be added.
export function productAvailability(kind, product, pending = false) {
  if (pending) return 'commercialProductBlocked'
  const issue = validateCart(kind, [{ productId: String(product.id), quantity: '1', unitAmount: '0' }], [product])
  if (issue === 'insufficientStock' && Number(product.stock) === 0) return 'catalogEmptyStock'
  return issue
}

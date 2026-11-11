export const WRITE_BLOCKED = 'Registro bloqueado: se requiere identidad real de IAM y autorización para escribir. La sesión de demostración no es válida para estas operaciones.'
export const movementLabels = { Purchase: 'Compra', Sale: 'Venta', Waste: 'Merma', CountAdjustment: 'Ajuste por conteo' }
export const countLabels = { Draft: 'Borrador', Confirmed: 'Confirmado', Cancelled: 'Cancelado' }
export function requireGuid(value) {
  if (typeof value !== 'string' || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value) || /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(value)) throw new Error('Introduce un GUID válido y no vacío.')
  return value
}
export function integerQuantity(value, minimum = 0) {
  if (!/^\d+$/.test(String(value)) || !Number.isInteger(Number(value)) || Number(value) < minimum || Number(value) > 2147483647) throw new Error(minimum ? 'La cantidad debe ser un entero positivo (máximo 2147483647).' : 'La cantidad física debe ser un entero no negativo (máximo 2147483647).')
  return Number(value)
}
function reference(item, products, lots) {
  requireGuid(item.productId)
  const product = products.find(p => p.id === item.productId)
  if (!product) throw new Error('Selecciona un producto real del backend.')
  let lot = null
  if (item.lotId) {
    requireGuid(item.lotId)
    lot = lots.find(l => l.id === item.lotId && l.productId === product.id)
    if (!lot) throw new Error('El lote no existe o no corresponde al producto.')
  }
  return { product, lot }
}
export function prepareWaste(draft, products, lots) {
  const { product, lot } = reference(draft, products, lots)
  if (!product.active) throw new Error('El producto está inactivo.')
  const quantity = integerQuantity(draft.quantity, 1)
  if (!lots.every(l => l.productId === product.id) || lots.reduce((n, l) => n + l.quantityAvailable, 0) !== product.stock) throw new Error('El stock y los lotes son inconsistentes; recarga Inventory.')
  if (quantity > product.stock || lot && quantity > lot.quantityAvailable) throw new Error('Stock insuficiente para registrar la merma.')
  const reason = draft.reason?.trim()
  if (!reason || reason.length > 255) throw new Error('El motivo es obligatorio y admite hasta 255 caracteres.')
  // userId is deliberately absent until a real identity provider is integrated.
  return { productId: product.id, lotId: lot?.id || null, quantity, reason }
}
export function prepareCount(draft, products, lots) {
  const notes = draft.notes?.trim() || null
  if (notes && notes.length > 500) throw new Error('Las notas admiten hasta 500 caracteres.')
  if (!Array.isArray(draft.items) || !draft.items.length) throw new Error('El conteo debe incluir al menos un detalle.')
  const items = draft.items.map(item => {
    reference(item, products, lots)
    return { productId: item.productId, lotId: item.lotId || null, countedQuantity: integerQuantity(item.countedQuantity) }
  })
  for (const item of items) {
    const sameProduct = items.filter(i => i.productId === item.productId)
    if (sameProduct.filter(i => i.lotId === item.lotId).length > 1) throw new Error('No repitas el mismo producto y lote.')
    if (sameProduct.length > 1 && sameProduct.some(i => i.lotId === null)) throw new Error('No mezcles el conteo total del producto con sus lotes.')
  }
  return { notes, items }
}

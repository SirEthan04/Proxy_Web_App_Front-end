import { toMinor } from './money.js'
export const isGuid = id => typeof id === 'string' && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id) && !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(id)
export const isTerminal = document => document.status !== 'Draft'
export { statusLabel } from '../../shared/presentation/utils/presentation.js'

export function createPayload(lines, products, lots) {
  if (!lines.length) throw new Error('Agrega al menos un producto.')
  const seen = new Set()
  const items = lines.map(line => {
    const product = products.find(p => p.id === line.productId)
    if (!product || !isGuid(product.id) || !product.active) throw new Error('Uno de los productos no existe o está inactivo.')
    if (seen.has(product.id)) throw new Error('Agrupa las cantidades del mismo producto en una sola línea.')
    seen.add(product.id)
    const quantity = Number(line.quantity), amount = toMinor(line.unitAmount)
    if (!['string', 'number'].includes(typeof line.quantity) || !Number.isInteger(quantity) || quantity <= 0 || quantity > 2147483647) throw new Error('La cantidad debe ser un entero positivo.')
    if (amount === null || amount > 999999999999) throw new Error('El importe debe ser válido y tener hasta dos decimales.')
    const lotId = line.lotId || null
    if (lotId && (!isGuid(lotId) || !lots[product.id]?.some(l => l.id === lotId && l.productId === product.id))) throw new Error('El lote no existe o no pertenece al producto.')
    return { productId: product.id, lotId, quantity, unitAmount: amount / 100 }
  })
  return { items }
}

export function adaptDocument(document, products) {
  return { ...document, createdAt: document.registeredAt, totalMinor: toMinor(document.total),
    registeredBy: { id: document.userId, name: document.userId },
    lines: document.items.map(item => ({ ...item, productName: products.find(p => p.id === item.productId)?.name || 'Producto no disponible',
      unitAmountMinor: toMinor(item.unitAmount), subtotalMinor: toMinor(item.subtotal) })) }
}

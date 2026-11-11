import { requireGuid } from '../domain/real-operations.js'
const fail = () => { throw new Error('La respuesta del backend no tiene el formato esperado.') }
function fields(value, ids, strings, integers) {
  if (!value || typeof value !== 'object') fail()
  ids.forEach(key => requireGuid(value[key]))
  if (value.lotId !== null) requireGuid(value.lotId)
  if (strings.some(key => typeof value[key] !== 'string') || integers.some(key => !Number.isInteger(value[key]))) fail()
}
function list(value, adapt) { if (!Array.isArray(value)) fail(); return value.map(adapt) }
export function adaptMovement(v) {
  fields(v, ['id', 'productId', 'userId'], ['movementType', 'sourceType', 'sourceId', 'createdAt'], ['quantityDelta'])
  return { id: v.id, productId: v.productId, lotId: v.lotId, userId: v.userId, movementType: v.movementType, quantityDelta: v.quantityDelta, sourceType: v.sourceType, sourceId: v.sourceId, createdAt: v.createdAt }
}
export const adaptMovements = v => list(v, adaptMovement)
export function adaptWaste(v) {
  fields(v, ['id', 'productId', 'userId'], ['reason', 'registeredAt'], ['quantity'])
  if (v.quantity <= 0) fail()
  return { id: v.id, productId: v.productId, lotId: v.lotId, userId: v.userId, quantity: v.quantity, reason: v.reason, registeredAt: v.registeredAt }
}
export const adaptWastes = v => list(v, adaptWaste)
export function adaptCount(v) {
  if (!v || !Array.isArray(v.items)) fail()
  requireGuid(v.id); requireGuid(v.userId)
  if (typeof v.countedAt !== 'string' || typeof v.status !== 'string' || v.notes !== null && typeof v.notes !== 'string') fail()
  return { id: v.id, userId: v.userId, countedAt: v.countedAt, status: v.status, notes: v.notes, items: v.items.map(i => {
    fields(i, ['id', 'productId'], [], ['expectedQuantity', 'countedQuantity', 'difference'])
    if (i.expectedQuantity < 0 || i.countedQuantity < 0 || i.difference !== i.countedQuantity - i.expectedQuantity) fail()
    return { id: i.id, productId: i.productId, lotId: i.lotId, expectedQuantity: i.expectedQuantity, countedQuantity: i.countedQuantity, difference: i.difference }
  }) }
}
export function adaptLots(v) {
  return list(v, lot => {
    requireGuid(lot.id); requireGuid(lot.productId)
    if (typeof lot.lotCode !== 'string' || !Number.isInteger(lot.quantityAvailable) || lot.quantityAvailable < 0) fail()
    return { ...lot }
  })
}

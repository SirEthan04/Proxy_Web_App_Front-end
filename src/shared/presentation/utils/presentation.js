export const movementLabels = Object.freeze({ Purchase: 'Compra', Sale: 'Venta', Waste: 'Merma', CountAdjustment: 'Ajuste por conteo' })
export const alertTypeLabels = Object.freeze({ LowStock: 'Stock bajo', OutOfStock: 'Sin stock', Expiration: 'Vencimiento' })
export const alertStatusLabels = Object.freeze({ Pending: 'Pendiente', Attended: 'Atendida' })
export const countLabels = Object.freeze({ Draft: 'Borrador', Confirmed: 'Confirmado', Cancelled: 'Cancelado' })
export function statusLabel(value, context = 'commercial') {
  const masculine = context === 'count'
  return ({ Draft: 'Borrador', Confirmed: masculine ? 'Confirmado' : 'Confirmada', Cancelled: masculine ? 'Cancelado' : 'Cancelada', Pending: 'Pendiente', Attended: 'Atendida', Activo: 'Disponible', 'Stock bajo': 'Stock bajo', 'Sin stock': 'Sin stock' })[value] || 'Estado no reconocido'
}
export const typeLabel = value => movementLabels[value] || alertTypeLabels[value] || 'Tipo no reconocido'
export function stockStatus(product) {
  if (product.active === false) return 'Inactivo'
  if (product.stock <= 0) return 'Sin stock'
  return product.stock <= product.minimumStock ? 'Stock bajo' : 'Disponible'
}
export const shortId = value => typeof value === 'string' ? value.replaceAll('-', '').slice(-8).toUpperCase() : ''
// Display references only. Never used as API identifiers or saved as document numbers.
export function recordReference(kind, id) {
  const name = ({ purchase: 'Compra', sale: 'Venta', Purchase: 'Compra', Sale: 'Venta', Waste: 'Merma', CountAdjustment: 'Conteo', count: 'Conteo', movement: 'Movimiento', alert: 'Alerta', lot: 'Lote' })[kind] || 'Registro'
  return id ? name + ' · ' + shortId(id) : name
}
export function lotLabel(lotId, lotCode) {
  if (!lotId) return 'Sin lote específico'
  if (!lotCode) return recordReference('lot', lotId)
  return lotCode.length > 24 ? lotCode.slice(0, 12) + '…' + lotCode.slice(-8) : lotCode
}
export const productLabel = (id, products) => products.find(p => p.id === id)?.name || 'Producto no disponible'
export const responsibleLabel = (id, users) => users.find(u => u.id === id)?.name || 'Nombre no disponible'
export const normalizeText = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

// All backend event dates are created with UtcNow. MySQL DATETIME loses Kind;
// only these ISO event values without an offset are restored as UTC, never browser-local.
export function backendInstant(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return null
  const zoned = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : value + 'Z'
  const date = new Date(zoned)
  return Number.isFinite(date.getTime()) ? date : null
}
export function formatDate(value) {
  if (!value) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value + 'T00:00:00Z')
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value.split('-').reverse().join('/') : 'Fecha no disponible'
  }
  const date = backendInstant(value)
  if (!date) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(date)
}
export function businessDate(value) {
  const date = backendInstant(value)
  if (!date) return ''
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const part = type => parts.find(p => p.type === type).value
  return part('year') + '-' + part('month') + '-' + part('day')
}
export function formatSoles(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean' || !Number.isFinite(Number(value))) return '—'
  return 'S/ ' + new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))
}
export function formatMinorSoles(minor) {
  if (!Number.isSafeInteger(minor) || minor < 0) return '—'
  return 'S/ ' + new Intl.NumberFormat('es-PE').format(BigInt(minor) / 100n) + '.' + String(BigInt(minor) % 100n).padStart(2, '0')
}
export function formatQuantity(value, signed = false) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  const prefix = signed && value > 0 ? '+' : value < 0 ? '−' : ''
  return prefix + new Intl.NumberFormat('es-PE').format(Math.abs(value)) + (Math.abs(value) === 1 ? ' unidad' : ' unidades')
}
export function countDifference(counted, expected) {
  if (!/^\d+$/.test(String(counted)) || !Number.isInteger(Number(counted)) || Number(counted) > 2147483647 || !Number.isInteger(expected) || expected < 0) return null
  return Number(counted) - expected
}
export function filterMovements(rows, { search = '', type = '', from = '', to = '' } = {}, products = []) {
  const validDay = day => !day || /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && new Date(day + 'T00:00:00Z').toISOString().slice(0, 10) === day
  if (!validDay(from) || !validDay(to) || from && to && from > to) return { rows: [], error: 'Revisa las fechas: el inicio no puede ser posterior al final.' }
  const query = normalizeText(search)
  return { error: null, rows: rows.filter(m => {
    const day = businessDate(m.createdAt)
    return (!type || m.movementType === type) && (!from || day && day >= from) && (!to || day && day <= to) && [productLabel(m.productId, products), typeLabel(m.movementType), recordReference(m.sourceType, m.sourceId), m.productId, m.sourceId].some(v => normalizeText(v).includes(query))
  }) }
}

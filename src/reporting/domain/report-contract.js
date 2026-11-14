export function reportParams({ from = '', to = '', limit = 10 } = {}) {
  for (const date of [from, to]) {
    if (!date) continue
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '1000-01-01' || !Number.isFinite(Date.parse(date + 'T00:00:00Z')) || new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date) throw new Error('Usa fechas válidas entre los años 1000 y 9999.')
  }
  if (from && to && from > to) throw new Error('La fecha inicial no puede ser posterior a la fecha final.')
  if (!/^\d+$/.test(String(limit)) || !Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 100) throw new Error('El límite debe ser un entero entre 1 y 100.')
  return { ...(from ? { from } : {}), ...(to ? { to } : {}), limit: Number(limit) }
}
const nonnegative = value => typeof value === 'number' && Number.isFinite(value) && value >= 0
export function adaptSummary(value) {
  if (!value || !nonnegative(value.salesCount) || !Number.isInteger(value.salesCount) || !nonnegative(value.totalAmount)) throw new Error('Resumen de ventas inválido')
  return { salesCount: value.salesCount, totalAmount: value.totalAmount }
}
export function adaptTopProducts(value) {
  if (!Array.isArray(value) || value.some(row => !row || typeof row.productId !== 'string' || typeof row.productName !== 'string' || !nonnegative(row.quantitySold) || !Number.isInteger(row.quantitySold))) throw new Error('Productos más vendidos inválidos')
  return value.map(({ productId, productName, quantitySold }) => ({ productId, productName, quantitySold }))
}

export const getEntries = (operations) => {
    return operations.filter(
        operation => operation.type === 'Entrada'
    )
}

export const getExits = (operations) => {
    return operations.filter(
        operation => operation.type === 'Salida'
    )
}

export const getTotalProducts = (products) => {
    return products.length
}

export const getTotalOperations = (operations) => {
    return operations.length
}

export const getTotalWastes = (wastes) => {
    return wastes.length
}

function calendarDate(year, month, day) {
  const text = String(year).padStart(4, '0') + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0')
  const date = new Date(text + 'T00:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === text ? text : null
}

// Query-only parsing: the original record/date is never modified or migrated.
// Actual legacy data: "6/10/2026, 2:10:00". toLocaleString() has no fixed locale,
// so that value cannot prove either day/month or month/day.
export function parseRecordDate(value) {
  if (typeof value !== 'string' || !value.trim()) return { date: null, reason: 'missing' }
  const text = value.trim()
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:$|T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$)/.exec(text)
  if (iso) {
    const date = calendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))
    if (date && (text.length === 10 || Number.isFinite(Date.parse(text)))) return { date, reason: null }
    return { date: null, reason: 'invalid' }
  }
  const legacy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:\s*[ap]\.?\s*m\.?)?)?$/i.exec(text)
  if (!legacy) return { date: null, reason: 'invalid' }
  const a = Number(legacy[1]), b = Number(legacy[2]), year = Number(legacy[3])
  if (a >= 1 && a <= 12 && b >= 1 && b <= 12 && a !== b) return { date: null, reason: 'ambiguous' }
  const month = a > 12 ? b : a
  const day = a > 12 ? a : b
  const date = calendarDate(year, month, day)
  return { date, reason: date ? null : 'invalid' }
}

export function queryRecords(records, { from = '', to = '', type = '' } = {}) {
  const validBound = value => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && parseRecordDate(value).date === value
  if (!validBound(from) || !validBound(to) || from && to && from > to) {
    return { rows: [], unknownDates: 0, excludedDates: 0, dateFiltered: Boolean(from || to), error: 'invalidReportPeriod' }
  }
  const candidates = type ? records.filter(record => record.type === type) : records
  const dateFiltered = Boolean(from || to)
  let unknownDates = 0
  const rows = candidates.filter(record => {
    const parsed = parseRecordDate(record.date)
    if (!parsed.date) { unknownDates++; return !dateFiltered }
    return (!from || parsed.date >= from) && (!to || parsed.date <= to)
  })
  return { rows, unknownDates, excludedDates: dateFiltered ? unknownDates : 0, dateFiltered, error: null }
}

export function summarizeRecords(records) {
  return {
    count: records.length,
    products: new Set(records.map(record => String(record.productId))).size,
    entries: records.filter(record => record.type === 'Entrada').length,
    exits: records.filter(record => record.type === 'Salida').length
  }
}

export function groupRecordsByProduct(records) {
  const groups = new Map()
  for (const record of records) {
    const key = String(record.productId)
    if (!groups.has(key)) groups.set(key, { productId: record.productId, productName: record.productName, count: 0, entries: 0, exits: 0, wastes: 0, invalidQuantities: 0 })
    const group = groups.get(key)
    group.count++
    const amount = Number(record.quantity)
    if (record.quantity === null || record.quantity === undefined || typeof record.quantity === 'string' && !record.quantity.trim() || typeof record.quantity === 'boolean' || !Number.isFinite(amount) || amount < 0) { group.invalidQuantities++; continue }
    if (record.type === 'Entrada') group.entries += amount
    else if (record.type === 'Salida') group.exits += amount
    else if (record.type === undefined || record.type === null) group.wastes += amount
    else group.invalidQuantities++
  }
  return [...groups.values()]
}

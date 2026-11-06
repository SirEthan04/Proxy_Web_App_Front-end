// Commercial amounts are integer cents. Never multiply binary decimal prices.
export function toMinor(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const text = String(value).trim()
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) return null
  const [whole, fraction = ''] = text.replace(',', '.').split('.')
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
  return cents <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(cents) : null
}
export function lineTotal(quantity, amount) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || !Number.isSafeInteger(amount) || amount < 0) return null
  const total = quantity * amount
  return Number.isSafeInteger(total) ? total : null
}
export function totalMinor(lines) {
  let total = 0
  for (const line of lines) {
    const subtotal = lineTotal(Number(line.quantity), line.unitAmountMinor)
    if (subtotal === null || !Number.isSafeInteger(total + subtotal)) return null
    total += subtotal
  }
  return total
}

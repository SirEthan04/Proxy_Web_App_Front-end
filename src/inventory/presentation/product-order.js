// Sort a copy. IDs remain opaque values and provide a stable tie-breaker.
export function sortProducts(products, key = 'name', direction = 'asc', language = 'es') {
  const collator = new Intl.Collator(language, { sensitivity: 'base', numeric: true })
  const validNumber = value => value !== null && value !== undefined && value !== '' && typeof value !== 'boolean' && Number.isFinite(Number(value))
  return [...products].sort((a, b) => {
    let result
    if (['price', 'stock'].includes(key)) {
      if (!validNumber(a[key])) return validNumber(b[key]) ? 1 : collator.compare(String(a.id), String(b.id))
      if (!validNumber(b[key])) return -1
      result = Number(a[key]) - Number(b[key])
    } else result = collator.compare(String(a[key] ?? ''), String(b[key] ?? ''))
    return (direction === 'desc' ? -1 : 1) * (result || collator.compare(String(a.id), String(b.id)))
  })
}

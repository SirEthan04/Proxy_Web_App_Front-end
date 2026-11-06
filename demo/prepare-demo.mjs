import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const discardedPurchases = Object.freeze([
  { id: 'd38ded29-13a0-42c4-8ff9-a1f1d96a1916', productId: '2' },
  { id: '69decdc0-05f7-4fbc-94a7-30b1418b8882', productId: '1' }
])

export function validateReferences(db) {
  const ids = new Set(db.products.map(p => String(p.id)))
  if (ids.size !== db.products.length) throw Error('Duplicate product IDs')
  for (const record of [...db.operations, ...db.wastes, ...db.purchases.flatMap(d => d.lines), ...db.sales.flatMap(d => d.lines)]) {
    if (!ids.has(String(record.productId))) throw Error('Missing product: ' + record.productId)
  }
  for (const [kind, documents] of [['purchase', db.purchases], ['sale', db.sales]]) {
    for (const document of documents) for (const line of document.lines) {
      if (line.movementId != null) {
        const matches = db.operations.filter(o => String(o.id) === String(line.movementId) && o.sourceId === document.id && o.sourceLineId === line.id && o.sourceType === kind && String(o.productId) === String(line.productId) && Number(o.quantity) === Number(line.quantity) && o.type === (kind === 'purchase' ? 'Entrada' : 'Salida'))
        if (matches.length !== 1) throw Error('Invalid movement reference: ' + document.id)
      }
    }
  }
  for (const movement of db.operations.filter(o => o.sourceId)) {
    const documents = movement.sourceType === 'purchase' ? db.purchases : movement.sourceType === 'sale' ? db.sales : []
    if (!documents.some(d => d.id === movement.sourceId && d.lines.some(l => l.id === movement.sourceLineId && String(l.productId) === String(movement.productId) && String(l.movementId) === String(movement.id)))) throw Error('Orphan commercial movement: ' + movement.id)
  }
}

export function buildDemoDatabase(original) {
  for (const name of ['products', 'users', 'operations', 'wastes', 'purchases', 'sales']) if (!Array.isArray(original[name])) throw Error('Missing collection: ' + name)
  validateReferences(original)
  for (const entry of discardedPurchases) {
    const matches = original.purchases.filter(d => d.id === entry.id)
    if (matches.length !== 1 || matches[0].status !== 'review' || matches[0].lines.length !== 1 || String(matches[0].lines[0].productId) !== entry.productId || matches[0].lines[0].movementId != null) throw Error('Authorized test purchase changed: ' + entry.id)
    if ([...original.operations, ...original.wastes, ...original.sales, ...original.purchases].some(record => record.sourceId === entry.id)) throw Error('Purchase is referenced: ' + entry.id)
  }
  const result = structuredClone(original)
  const excluded = new Set(discardedPurchases.map(d => d.id))
  result.purchases = result.purchases.filter(d => !excluded.has(d.id))
  validateReferences(result)
  return result
}

export async function prepareDemo() {
  const source = resolve('server/db.json'), target = resolve('server/demo-db.json')
  const raw = await readFile(source, 'utf8')
  const db = buildDemoDatabase(JSON.parse(raw))
  // Exclusive creation: never reset an existing demonstration or its history.
  await writeFile(target, JSON.stringify(db, null, 2) + '\n', { flag: 'wx' })
  await writeFile('server/demo-db.manifest.local', JSON.stringify({
    source, target, sourceSha256: createHash('sha256').update(raw).digest('hex'),
    excludedPurchases: discardedPurchases, reason: 'Owner confirmed these two purchases were development tests, not real transactions.',
    createdAt: new Date().toISOString()
  }, null, 2) + '\n', { flag: 'wx' })
  console.log('Created', target)
  console.log('Products:', db.products.length, 'Purchases:', db.purchases.length, 'Sales:', db.sales.length)
  console.log('Original database and stock unchanged. Use a fresh browser profile.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await prepareDemo()
}

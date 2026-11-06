// Offline, append-only import. Default: inspect without writing.
import { readFile, writeFile, copyFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { resolve } from 'node:path'

const [snapshotPath, targetPath = 'server/db.json', flag] = process.argv.slice(2)
if (!snapshotPath || (flag && flag !== '--apply')) throw Error('Usage: node server/import-products.mjs snapshot.json [target.json] [--apply]')
const original = await readFile(targetPath, 'utf8')
const db = JSON.parse(original)
const incoming = JSON.parse(await readFile(snapshotPath, 'utf8'))
if (!Array.isArray(db.products) || !Array.isArray(incoming)) throw Error('Expected product arrays')
const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
const byId = new Map()
const byName = new Map()
for (const product of db.products) {
  if (byId.has(String(product.id))) throw Error('Duplicate existing ID: ' + product.id)
  byId.set(String(product.id), product)
  byName.set(normalize(product.name), String(product.id))
}
const additions = []
const seen = new Set()
for (const product of incoming) {
  if (product.id == null || !String(product.id) || typeof product.name !== 'string' || !product.name.trim()) throw Error('Invalid product identity')
  const id = String(product.id)
  if (seen.has(id)) throw Error('Duplicate incoming ID: ' + id)
  seen.add(id)
  if (byId.has(id)) {
    const current = byId.get(id)
    if (Object.keys(product).some(key => JSON.stringify(product[key]) !== JSON.stringify(current[key]))) throw Error('Conflicting existing product: ' + id)
    continue
  }
  if (byName.has(normalize(product.name))) throw Error('Duplicate name with different ID: ' + product.name)
  if (!Number.isFinite(Number(product.stock)) || Number(product.stock) < 0 || !Number.isFinite(Number(product.price)) || Number(product.price) < 0) throw Error('Invalid price/stock: ' + id)
  // Whitelist catalog fields; never import credentials or unrelated remote fields.
  additions.push(Object.fromEntries(['id', 'name', 'category', 'price', 'stock', 'status', 'expirationDate'].map(key => [key, product[key]])))
  byName.set(normalize(product.name), id)
  byId.set(id, product)
}
const missing = new Set()
for (const record of [...(db.operations || []), ...(db.wastes || []), ...(db.purchases || []).flatMap(d => d.lines), ...(db.sales || []).flatMap(d => d.lines)]) {
  if (!byId.has(String(record.productId))) missing.add(String(record.productId))
}
if (missing.size) throw Error('Unresolved historical product IDs: ' + [...missing].join(', '))
console.log(JSON.stringify({ target: resolve(targetPath), mode: flag === '--apply' ? 'apply' : 'dry-run', additions: additions.map(p => ({ id: p.id, name: p.name })) }, null, 2))
if (flag === '--apply' && additions.length) {
  if (await readFile(targetPath, 'utf8') !== original) throw Error('Database changed during inspection')
  const backup = targetPath + '.' + Date.now() + '.backup.local'
  await copyFile(targetPath, backup, constants.COPYFILE_EXCL)
  db.products.push(...additions)
  await writeFile(targetPath, JSON.stringify(db, null, 2) + '\n')
  console.log('Backup:', backup)
}

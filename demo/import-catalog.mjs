// Offline import: only a separate explicitly marked JSON Server fixture.
import { readFile, writeFile, realpath } from 'node:fs/promises'
import { resolve } from 'node:path'
const [target, confirmation] = process.argv.slice(2)
if (!target || confirmation !== '--isolated-demo-only') throw Error('Usage: node demo/import-catalog.mjs <isolated-db.json> --isolated-demo-only')
const path = await realpath(target)
const protectedPath = await realpath('server/db.json').catch(error => {
  if (error.code !== 'ENOENT') throw error
  return resolve('server/db.json')
})
if (path === protectedPath) throw Error('The project database is protected')
const db = JSON.parse(await readFile(path, 'utf8'))
if (db.demoOnly !== true || !Array.isArray(db.products)) throw Error('Requires demoOnly: true and products array')
const seed = JSON.parse(await readFile(new URL('./catalog.json', import.meta.url), 'utf8'))
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const existing = new Set(db.products.map(p => normalize(p.name)))
const ids = new Set(db.products.map(p => String(p.id)))
let added = 0
for (const [index, product] of seed.products.entries()) {
  if (existing.has(normalize(product.name))) continue
  const id = 'demo-catalog-' + (index + 1)
  if (ids.has(id)) throw Error('Conflicting seed ID: ' + id)
  db.products.push({ ...product, id }); existing.add(normalize(product.name)); added++
}
await writeFile(path, JSON.stringify(db, null, 2) + '\n')
console.log('Demo products added:', added)

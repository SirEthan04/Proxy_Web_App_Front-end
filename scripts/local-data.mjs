import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'

export const collections = ['products', 'users', 'purchases', 'sales', 'operations', 'wastes']
export async function ensureLocalData(root = process.cwd()) {
  const target = resolve(root, 'server/work-db.json')
  await mkdir(dirname(target), { recursive: true })
  try {
    const db = JSON.parse(await readFile(target, 'utf8'))
    if (!collections.every(name => Array.isArray(db[name]))) throw Error('Base local incompleta: ' + target + '. Conserva el archivo y revisa sus datos.')
    return target
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const seed = await readFile(resolve(root, 'server/seed.json'), 'utf8')
  const db = JSON.parse(seed)
  if (!collections.every(name => Array.isArray(db[name]))) throw Error('Semilla incompleta')
  try { await writeFile(target, seed, { flag: 'wx' }) }
  catch (error) { if (error.code !== 'EEXIST') throw error }
  return target
}

import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { constants } from 'node:fs'

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

export async function resetLocalData(root = process.cwd()) {
  const target = await ensureLocalData(root)
  const backup = target + '.' + Date.now() + '.backup.local'
  await copyFile(target, backup, constants.COPYFILE_EXCL)
  const seed = await readFile(resolve(root, 'server/seed.json'), 'utf8')
  JSON.parse(seed)
  await writeFile(target, seed)
  return backup
}

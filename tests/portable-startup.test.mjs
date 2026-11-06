import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import net from 'node:net'
import { ensureLocalData, resetLocalData, collections } from '../scripts/local-data.mjs'
import { checkPort } from '../scripts/ports.mjs'

test('fresh local database uses versioned seed and never overwrites existing records', async () => {
  const root = await mkdtemp(join(tmpdir(), 'bodego-portable-'))
  try {
    await mkdir(join(root, 'server'))
    await copyFile('server/seed.json', join(root, 'server/seed.json'))
    const target = await ensureLocalData(root)
    const initial = JSON.parse(await readFile(target, 'utf8'))
    assert.ok(collections.every(key => Array.isArray(initial[key])))
    for (const key of ['purchases', 'sales', 'operations', 'wastes']) assert.equal(initial[key].length, 0)
    const edited = structuredClone(initial); edited.products[0].stock = 123
    await writeFile(target, JSON.stringify(edited))
    await ensureLocalData(root)
    assert.equal(JSON.parse(await readFile(target, 'utf8')).products[0].stock, 123)
    const backup = await resetLocalData(root)
    assert.deepEqual(JSON.parse(await readFile(backup, 'utf8')), edited)
    assert.deepEqual(JSON.parse(await readFile(target, 'utf8')), initial)
    await writeFile(target, '{bad-json')
    await assert.rejects(ensureLocalData(root))
    assert.equal(await readFile(target, 'utf8'), '{bad-json')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('occupied port produces an explicit error instead of selecting another port', async () => {
  const server = net.createServer().listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  const port = server.address().port
  try { await assert.rejects(checkPort(port, 'Prueba'), error => error.message.includes(String(port)) && error.message.includes('ocupado')) }
  finally { await new Promise(resolve => server.close(resolve)) }
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createServer } from 'vite'
import jsonServer from 'json-server'
import { createPinia, setActivePinia } from 'pinia'

test('new portable seed supports fresh login and all inventory/commercial workflows', async () => {
  const raw = await readFile('server/seed.json', 'utf8')
  const root = await mkdtemp(join(tmpdir(), 'bodego-seed-workflows-'))
  const target = join(root, 'db.json'); await writeFile(target, raw)
  const server = jsonServer.create()
  server.use(jsonServer.bodyParser); server.use(jsonServer.router(target))
  const http = server.listen(0, '127.0.0.1')
  await new Promise(resolve => http.once('listening', resolve))
  const vite = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' })
  const load = path => vite.ssrLoadModule('/src/' + path)
  const storage = new Map()
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key,value) => storage.set(key,value), removeItem: key => storage.delete(key) }
  try {
    const { api } = await load('shared/infrastructure/http-client.js')
    api.defaults.baseURL = `http://127.0.0.1:${http.address().port}`
    setActivePinia(createPinia())
    const { useAuthStore } = await load('iam/application/auth.js')
    const { useProductsStore } = await load('inventory/application/products.js')
    const { useCommercialStore } = await load('commercial/application/commercial.js')
    const { useOperationsStore } = await load('operations/application/operations.js')
    const { useWasteStore } = await load('operations/application/waste.js')
    const auth = useAuthStore(), products = useProductsStore(), commercial = useCommercialStore()
    await auth.loadUser(); assert.equal(auth.isAuthenticated, false)
    assert.equal(await auth.login('admin@bodego.com','1234'), true)
    await products.loadProducts(); assert.equal(products.products.length, JSON.parse(raw).products.length)
    const temporary = await products.addProduct({ name: 'Temporary isolated', category: 'Hogar', price: 2, stock: 0, expirationDate: '2030-12-31' })
    await products.updateProductDetails(temporary.id, { ...temporary, name: 'Edited isolated' })
    await products.deleteProduct(temporary.id)
    await commercial.load('purchase'); assert.equal(commercial.purchases.length, 0)
    async function cart(kind) {
      await products.loadProducts()
      return ['1','X9PeXW7'].map(id => {
        const p = products.products.find(p => String(p.id) === id)
        return { productId:id, quantity:'1', unitAmount:kind === 'sale' ? String(p.price) : '1.25', expectedStock:p.stock }
      })
    }
    assert.equal((await commercial.register('purchase', await cart('purchase'))).status, 'completed')
    auth.logout(); assert.equal(await auth.login('empleado@bodego.com','1234'), true)
    assert.equal(auth.can('reports.read'), false)
    await assert.rejects(products.addProduct({}), e => e.messageKey === 'accessDeniedMessage')
    assert.equal((await commercial.register('sale', await cart('sale'))).status, 'completed')
    await products.loadProducts()
    const p = products.products.find(p => String(p.id) === '1')
    await useOperationsStore().registerOperation({ productId:p.id, quantity:1, type:'Entrada', expectedStock:p.stock })
    await useWasteStore().registerWaste({ productId:p.id, quantity:1, reason:'Producto vencido', expectedStock:p.stock + 1 })
    await products.loadProducts()
    const alerts = await load('monitoring/application/alerts.js')
    assert.equal(alerts.getOutOfStockProducts(products.products).length, 0)
    const reports = await load('reporting/application/reports.js')
    await useOperationsStore().loadOperations(); await useWasteStore().loadWastes()
    assert.equal(reports.getTotalOperations(useOperationsStore().operations), 5)
    assert.equal(reports.getTotalWastes(useWasteStore().wastes), 1)
    const { messages, setLocale, t } = await load('i18n.js')
    assert.deepEqual(Object.keys(messages.es).sort(),Object.keys(messages.en).sort())
    for (const language of ['es','en']) { setLocale(language); assert.notEqual(t('catalogRowNumber'),'catalogRowNumber') }
    const db = JSON.parse(await readFile(target,'utf8'))
    assert.equal(db.purchases.length,1); assert.equal(db.sales.length,1)
    assert.equal(db.products.find(p => String(p.id)==='1').stock,20)
    assert.deepEqual(jsonServer.router(target).db.getState(),db)
    assert.equal(storage.get('bodego-commercial-pending-v1'),'[]')
    assert.equal(await readFile('server/seed.json','utf8'),raw)
  } finally {
    await vite.close(); await new Promise(resolve => http.close(resolve))
    await rm(root,{recursive:true,force:true}); delete globalThis.localStorage
  }
})

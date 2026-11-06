import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toMinor, totalMinor } from '../src/commercial/domain/money.js'
import { validateCart, catalogChanged } from '../src/commercial/domain/commercial-validation.js'
import { createPurchase } from '../src/commercial/domain/purchase.js'
import { validDocument, isTerminal } from '../src/commercial/domain/commercial-status.js'
import { permissionsForRole, PERMISSIONS } from '../src/iam/domain/permissions.js'
import { getProductValidationError, PRODUCT_CATEGORIES } from '../src/inventory/domain/product-validation.js'
import { previewOperation, previewWaste } from '../src/operations/domain/stock-change.js'
import { WASTE_REASONS } from '../src/operations/domain/waste.js'
import { connectionFeedback } from '../src/commercial/presentation/connection-feedback.js'
import { readPending, savePending } from '../src/commercial/infrastructure/pending-journal.js'
const products = [{ id: '2', name: 'Test', stock: 5, price: 3.5 }, { id: '10', name: 'Other', stock: 2, price: 1.2 }]
const lines = products.map(p => ({ productId: p.id, quantity: 2, unitAmount: '1.25', expectedStock: p.stock }))
test('money, multi-product purchase and sale, insufficient stock and duplicates', () => {
 assert.equal(toMinor('3,50'), 350); assert.equal(toMinor('1.001'), null)
 assert.equal(totalMinor([{quantity:3, unitAmountMinor:10}]),30)
 assert.equal(validateCart('purchase', lines, products), null)
 assert.equal(validateCart('sale', lines, products), null)
 assert.equal(validateCart('sale', [{...lines[0], quantity:6}], products),'insufficientStock')
 assert.equal(validateCart('purchase', [lines[0],lines[0]], products),'commercialDuplicate')
 assert.equal(validateCart('purchase', [{...lines[0],unitAmount:'oops'}], products),'commercialAmountError')
 assert.equal(catalogChanged('purchase', lines, products), false)
 const doc=createPurchase(lines,products,{role:'Administrador'})
 assert.equal(doc.totalMinor,500); assert.equal(validDocument(doc),true)
 doc.status='review'; assert.equal(isTerminal(doc),false)
 doc.status='completed'; assert.equal(validDocument(doc),false)
})
test('role permissions and catalog compatibility', () => {
 assert.ok(permissionsForRole('Administrador').includes(PERMISSIONS.PRODUCTS_CREATE))
 assert.ok(!permissionsForRole('Empleado').includes(PERMISSIONS.PRODUCTS_CREATE))
 assert.ok(permissionsForRole('Empleado').includes(PERMISSIONS.PURCHASES_CREATE))
 assert.ok(!permissionsForRole('Empleado').includes(PERMISSIONS.REPORTS_READ))
 assert.equal(PRODUCT_CATEGORIES.length,12)
 for(const category of [...PRODUCT_CATEGORIES,'Galletas','Snacks']) assert.equal(getProductValidationError({name:'Test',category,price:1,stock:0,expirationDate:'2030-12-31'}),null)
 const ids=['1','8','2','3','4','7','10','a2','a10']; ids.sort(new Intl.Collator('es',{numeric:true}).compare)
 assert.deepEqual(ids,['1','2','3','4','7','8','10','a2','a10'])
})
test('adjustments, waste previews and HTTP feedback', () => {
 assert.equal(previewOperation(5,2,'Entrada').stockAfter,7)
 assert.equal(previewOperation(5,6,'Salida').errorKey,'insufficientStock')
 assert.equal(previewWaste(5,2,WASTE_REASONS[0]).stockAfter,3)
 assert.equal(previewWaste(5,6,WASTE_REASONS[0]).valid,false)
 assert.equal(connectionFeedback({code:'ERR_NETWORK'}),'posServiceOffline')
 assert.equal(connectionFeedback({response:{status:404}}),'posServiceMissing')
 assert.equal(connectionFeedback({response:{status:500}}),'posServiceUnavailable')
})
test('isolated pending journal retains unresolved documents', () => {
 const storage = new Map(); globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}
 const doc=createPurchase(lines, products,{role:'Administrador'});doc.status='review'
 savePending('purchase',doc);assert.equal(readPending()[0].document.status,'review')
 savePending('purchase',doc);assert.equal(readPending().length,1)
})

test('offline demo importer is repeatable and protects the project database', async () => {
 const { mkdtemp, writeFile, readFile, rm } = await import('node:fs/promises')
 const { tmpdir } = await import('node:os')
 const { join } = await import('node:path')
 const { execFileSync } = await import('node:child_process')
 const dir = await mkdtemp(join(tmpdir(), 'bodego-demo-'))
 const target = join(dir, 'isolated.json')
 try {
  await writeFile(target, JSON.stringify({demoOnly:true, products:[]}))
  const run = file => execFileSync(process.execPath,['demo/import-catalog.mjs',file,'--isolated-demo-only'])
  run(target)
  const first = JSON.parse(await readFile(target,'utf8'))
  assert.equal(first.products.length,59)
  run(target)
  assert.equal(JSON.parse(await readFile(target,'utf8')).products.length,59)
  assert.ok(first.products.every(p => p.stock === 0 && getProductValidationError(p) === null))
  assert.throws(() => run('server/db.json'))
 } finally { await rm(target); await (await import('node:fs/promises')).rmdir(dir) }
})

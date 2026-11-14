import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { movementLabels, statusLabel, stockStatus, typeLabel, recordReference, lotLabel, productLabel, responsibleLabel, formatDate, businessDate, formatSoles, formatMinorSoles, formatQuantity, countDifference, filterMovements } from '../src/shared/presentation/utils/presentation.js'

const id = '11111111-1111-4111-8111-111111111111'
const otherId = '22222222-2222-4222-8222-222222222222'
test('estados y tipos reales se traducen sin alterar valores de contrato', () => {
  assert.equal(statusLabel('Draft'), 'Borrador')
  assert.equal(statusLabel('Confirmed'), 'Confirmada')
  assert.equal(statusLabel('Confirmed', 'count'), 'Confirmado')
  assert.equal(statusLabel('Cancelled', 'count'), 'Cancelado')
  assert.equal(statusLabel('Pending'), 'Pendiente')
  assert.equal(statusLabel('Attended'), 'Atendida')
  assert.equal(statusLabel('Activo'), 'Disponible')
  assert.deepEqual(Object.values(movementLabels), ['Compra', 'Venta', 'Merma', 'Ajuste por conteo'])
  assert.equal(typeLabel('Expiration'), 'Vencimiento')
  assert.equal(typeLabel('LowStock'), 'Stock bajo')
  assert.equal(typeLabel('Other'), 'Tipo no reconocido')
  assert.equal(stockStatus({ active: true, stock: 8, minimumStock: 3 }), 'Disponible')
  assert.equal(stockStatus({ active: true, stock: 3, minimumStock: 3 }), 'Stock bajo')
  assert.equal(stockStatus({ active: true, stock: 0, minimumStock: 3 }), 'Sin stock')
  assert.equal(stockStatus({ active: false, stock: 8, minimumStock: 3 }), 'Inactivo')
})
test('fechas UTC con y sin Z muestran la misma hora peruana, respetando offsets y cambio de día', () => {
  const unzoned = '2026-11-11T22:02:32.354715'
  assert.equal(formatDate(unzoned), formatDate(unzoned + 'Z'))
  assert.equal(formatDate(unzoned), formatDate('2026-11-11T17:02:32.354715-05:00'))
  assert.match(formatDate(unzoned), /11\/11\/2026/)
  assert.match(formatDate(unzoned), /5:02/)
  assert.equal(businessDate('2026-11-11T02:00:00Z'), '2026-11-10')
  assert.equal(businessDate('2026-11-11T02:00:00'), '2026-11-10')
  assert.equal(formatDate('2026-11-11'), '11/11/2026')
  assert.equal(formatDate('2026-02-30'), 'Fecha no disponible')
  assert.equal(formatDate('invalid'), 'Fecha no disponible')
  assert.equal(formatDate(null), '—')
})
test('importes en soles tienen dos decimales y cantidades expresan signo y unidades', () => {
  assert.equal(formatSoles(15), 'S/ 15.00')
  assert.equal(formatSoles(0), 'S/ 0.00')
  assert.equal(formatMinorSoles(1501), 'S/ 15.01')
  assert.equal(formatMinorSoles(0), 'S/ 0.00')
  assert.equal(formatMinorSoles(null), '—')
  assert.equal(formatQuantity(5, true), '+5 unidades')
  assert.equal(formatQuantity(-2, true), '−2 unidades')
  assert.equal(formatQuantity(-1, true), '−1 unidad')
  assert.equal(formatQuantity(0), '0 unidades')
})
test('nombres y referencias breves conservan los GUID para acciones sin inventar responsables', () => {
  const products = [{ id, name: 'Producto con nombre extenso y real' }]
  assert.equal(productLabel(id, products), products[0].name)
  assert.equal(productLabel(otherId, products), 'Producto no disponible')
  assert.equal(responsibleLabel(id, []), 'Nombre no disponible')
  assert.equal(responsibleLabel(id, [{ id, name: 'Responsable real' }]), 'Responsable real')
  assert.equal(recordReference('purchase', id), 'Compra · 11111111')
  assert.equal(recordReference('sale', id), 'Venta · 11111111')
  assert.ok(!recordReference('movement', id).includes(id))
  assert.ok(lotLabel(id).length < id.length)
  assert.equal(lotLabel(id, 'LOTE-REAL'), 'LOTE-REAL')
  assert.equal(id, '11111111-1111-4111-8111-111111111111')
})
test('diferencias de conteo cambian con la cantidad y nunca alteran el stock', () => {
  const stock = 8
  assert.equal(countDifference('10', stock), 2)
  assert.equal(countDifference('6', stock), -2)
  assert.equal(countDifference('0', stock), -8)
  assert.equal(countDifference('8', stock), 0)
  for (const v of ['', ' ', null, false, -1, 0.5]) assert.equal(countDifference(v, stock), null)
  assert.equal(stock, 8)
})
test('filtros combinados por producto, tipo y día peruano, con extremos inclusivos y vacíos válidos', () => {
  const products = [{ id, name: 'Café peruano' }, { id: otherId, name: 'Arroz' }]
  const rows = [
    { id, productId: id, movementType: 'Sale', sourceType: 'Sale', sourceId: id, createdAt: '2026-11-11T02:00:00', quantityDelta: -2 },
    { id: otherId, productId: otherId, movementType: 'Purchase', sourceType: 'Purchase', sourceId: otherId, createdAt: '2026-11-11T12:00:00', quantityDelta: 5 }
  ]
  const result = filterMovements(rows, { search: 'cafe', type: 'Sale', from: '2026-11-10', to: '2026-11-10' }, products)
  assert.deepEqual(result.rows, [rows[0]])
  assert.equal(result.rows[0].sourceId, id)
  assert.deepEqual(filterMovements([], {}, products), { rows: [], error: null })
  assert.deepEqual(filterMovements(rows, { search: 'inexistente' }, products).rows, [])
  assert.ok(filterMovements(rows, { from: '2026-11-12', to: '2026-11-11' }, products).error)
  assert.ok(filterMovements(rows, { from: '2026-02-30' }, products).error)
})
test('las tablas y formularios compilan; acciones usan GUID originales y columnas principales no exponen IDs', async () => {
  const paths = ['operations/presentation/Operations.vue', 'operations/presentation/Waste.vue', 'operations/presentation/components/PreparedOperationForm.vue', 'monitoring/presentation/Alerts.vue', 'reporting/presentation/Reports.vue', 'inventory/presentation/Products.vue', 'commercial/presentation/CommercialDetails.vue', 'commercial/presentation/components/CommercialCart.vue']
  for (const path of paths) {
    const source = await readFile(new URL('../src/' + path, import.meta.url), 'utf8')
    const { descriptor, errors } = parse(source)
    assert.equal(errors.length, 0, path)
    const script = compileScript(descriptor, { id: path })
    const compiled = compileTemplate({ id: path, source: descriptor.template.content, filename: path, compilerOptions: { bindingMetadata: script.bindings } })
    assert.equal(compiled.errors.length, 0, path)
    assert.doesNotMatch(descriptor.template.content, /<th[^>]*>GUID<\/th>/)
  }
  const movements = await readFile(new URL('../src/operations/presentation/Operations.vue', import.meta.url), 'utf8')
  assert.match(movements, /:to="'\/products\/' \+ m.productId"/)
  assert.match(movements, /@click="movementDetails\(m\)"/)
  assert.match(movements, /'Identificador del movimiento': m.id/)
  const form = await readFile(new URL('../src/operations/presentation/components/PreparedOperationForm.vue', import.meta.url), 'utf8')
  assert.match(form, /countDifference\(quantity.value, available.value\)/)
  assert.match(form, /:value="lot.id"/)
  assert.match(form, /auth.can/)
  assert.match(form, /operations.registerCount/)
})

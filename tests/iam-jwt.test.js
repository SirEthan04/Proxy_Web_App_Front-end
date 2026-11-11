import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { AxiosError } from 'axios'
import { useAuthStore } from '../src/iam/application/auth.js'
import { authenticationGuard } from '../src/iam/infrastructure/authentication-guard.js'
import { session, clearSession, acceptToken, acceptUser, validSession } from '../src/iam/infrastructure/session.js'
import { queryApi } from '../src/shared/infrastructure/query-client.js'
import { api as legacyApi } from '../src/shared/infrastructure/http-client.js'
import { inventoryApi } from '../src/inventory/infrastructure/inventory-api.js'
import { PERMISSIONS } from '../src/iam/domain/permissions.js'
import { useRealOperationsStore } from '../src/operations/application/real-operations.js'
import { useProductsStore } from '../src/inventory/application/inventory.js'
import { useCommercialStore } from '../src/commercial/application/real-commercial.js'

// Mock credentials/token only. No request in this suite reaches any network adapter.
const id = '11111111-1111-4111-8111-111111111111'
const lotId = '22222222-2222-4222-8222-222222222222'
const user = { id, name: 'Fixture', email: 'fixture@example.invalid', roleId: 1, role: 'Administrador' }
const token = () => ({ accessToken: 'fixture-access-token', tokenType: 'Bearer', expiresAt: new Date(Date.now() + 60000).toISOString(), user })
const product = { id, name: 'Fixture', categoryId: id, salePrice: 2, minimumStock: 0, active: true, stock: 5 }
const lot = { id: lotId, productId: id, lotCode: 'Fixture', quantityAvailable: 5, expirationDate: null, receivedAt: '2026-11-11T12:00:00' }
const waste = { id, productId: id, lotId, userId: id, quantity: 1, reason: 'Fixture', registeredAt: '2026-11-11T12:00:00' }
const count = { id, userId: id, countedAt: '2026-11-11T12:00:00', status: 'Confirmed', notes: null, items: [{ id, productId: id, lotId: null, expectedQuantity: 5, countedQuantity: 3, difference: -2 }] }
const reply = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} })
let requests
function authenticate(role = 'Administrador') { acceptToken(token()); acceptUser({ ...user, role }); useAuthStore().initialized = true }
function inventoryMock(config) {
  requests.push(config)
  const data = config.url === '/products' ? [product] : config.url.endsWith('/lots') ? [lot] : []
  return Promise.resolve(reply(config, data))
}
beforeEach(() => {
  clearSession(); setActivePinia(createPinia()); requests = []
  inventoryApi.defaults.adapter = inventoryMock
  queryApi.defaults.adapter = legacyApi.defaults.adapter = async () => { throw new Error('Unexpected mock request') }
})

test('login envía credenciales únicamente a auth/login y valida usuario con auth/me y Bearer', async () => {
  queryApi.defaults.adapter = async config => { requests.push(config); return reply(config, config.url === '/auth/login' ? token() : user) }
  const auth = useAuthStore()
  assert.equal(await auth.login(user.email, 'isolated-fixture-password'), true)
  assert.deepEqual(requests.map(r => [r.method, r.url]), [['post', '/auth/login'], ['get', '/auth/me']])
  assert.equal(requests[0].headers.get('Authorization'), undefined)
  assert.deepEqual(JSON.parse(requests[0].data), { email: user.email, password: 'isolated-fixture-password' })
  assert.equal(requests[1].headers.get('Authorization'), 'Bearer fixture-access-token')
  assert.deepEqual(auth.user, user)
  assert.equal(auth.isAuthenticated, true)
  assert.equal('password' in auth.$state, false)
})
test('401 de login o me no conserva sesión ni simula éxito; 403 se muestra sin elevar permisos', async () => {
  const auth = useAuthStore()
  for (const failingPath of ['/auth/login', '/auth/me']) {
    queryApi.defaults.adapter = async config => {
      if (config.url === failingPath) throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, { status: 401 })
      return reply(config, token())
    }
    assert.equal(await auth.login(user.email, 'fixture-only'), false)
    assert.equal(session.accessToken, null); assert.equal(auth.user, null)
    assert.match(auth.error, /válidos|venció/)
  }
  authenticate('Empleado')
  queryApi.defaults.adapter = async config => { throw new AxiosError('Forbidden', 'ERR_BAD_REQUEST', config, null, { status: 403 }) }
  await assert.rejects(queryApi.get('/protected'))
  assert.equal(auth.user.role, 'Empleado'); assert.equal(auth.can(PERMISSIONS.REPORTS_READ), false)
})
test('Bearer no se envía a JSON Server, otros hosts ni rutas ajenas a api/v1', async () => {
  authenticate()
  const capture = async config => { requests.push(config); return reply(config, []) }
  queryApi.defaults.adapter = inventoryApi.defaults.adapter = legacyApi.defaults.adapter = capture
  await inventoryApi.get('/products'); await queryApi.get('/alerts'); await legacyApi.get('/users')
  await queryApi.get('http://localhost:3001/users'); await queryApi.get('https://example.invalid/api/v1/products'); await queryApi.get('http://localhost:5281/api/v10/products')
  assert.ok(requests.slice(0, 2).every(r => r.headers.get('Authorization') === 'Bearer fixture-access-token'))
  assert.ok(requests.slice(2).every(r => !r.headers.get('Authorization')))
})
test('logout y vencimiento limpian token, usuario y permisos; rutas protegidas vuelven a login', async () => {
  const auth = useAuthStore(); authenticate()
  auth.logout()
  assert.equal(session.accessToken, null); assert.equal(auth.user, null); assert.equal(auth.can(PERMISSIONS.SALES_CREATE), false)
  const target = { path: '/sales', fullPath: '/sales', meta: { requiresAuth: true, permission: PERMISSIONS.SALES_READ } }
  assert.equal((await authenticationGuard(target)).path, '/login')
  authenticate(); session.expiresAt = Date.now() - 1
  assert.equal(validSession(), false); assert.equal(session.user, null)
  await assert.rejects(useCommercialStore().register('sale', []), /sesión/)
})
test('roles proceden de me: empleado opera pero no accede a reportes; rol desconocido se rechaza', async () => {
  const auth = useAuthStore(); authenticate('Empleado')
  assert.equal(auth.can(PERMISSIONS.SALES_CREATE), true); assert.equal(auth.can(PERMISSIONS.WASTE_WRITE), true)
  assert.equal(auth.can(PERMISSIONS.REPORTS_READ), false)
  assert.deepEqual(await authenticationGuard({ path: '/reports', fullPath: '/reports', meta: { requiresAuth: true, permission: PERMISSIONS.REPORTS_READ } }), { path: '/access-denied', replace: true })
  assert.throws(() => acceptUser({ ...user, role: 'Superuser' }))
})
test('401 autenticado invalida sesión y un 401 antiguo no borra una sesión nueva', async () => {
  authenticate()
  queryApi.defaults.adapter = async config => { throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, { status: 401 }) }
  await assert.rejects(queryApi.get('/auth/me')); assert.equal(session.accessToken, null)
  authenticate()
  let release
  queryApi.defaults.adapter = config => new Promise((resolve, reject) => { release = () => reject(new AxiosError('Old response', 'ERR_BAD_REQUEST', config, null, { status: 401 })) })
  const old = queryApi.get('/auth/me'); await Promise.resolve(); await Promise.resolve()
  clearSession(); acceptToken({ ...token(), accessToken: 'new-fixture-token' }); acceptUser(user)
  release(); await assert.rejects(old); assert.equal(session.accessToken, 'new-fixture-token')
})
test('logout durante login impide que la respuesta tardía restaure la sesión', async () => {
  let release
  queryApi.defaults.adapter = config => new Promise(resolve => { release = () => resolve(reply(config, token())) })
  const auth = useAuthStore(), pending = auth.login(user.email, 'fixture-only')
  await Promise.resolve(); await Promise.resolve(); auth.logout(); release()
  assert.equal(await pending, false); assert.equal(session.accessToken, null)
})
test('merma autenticada no envía userId y recarga Inventory, movimientos e historial sin descontar localmente', async () => {
  authenticate()
  queryApi.defaults.adapter = async config => { requests.push(config); return reply(config, config.method === 'post' ? waste : []) }
  const store = useRealOperationsStore()
  const result = await store.registerWaste({ productId: id, lotId, quantity: 1, reason: 'Fixture', userId: 'ignored' })
  assert.equal(result.id, id)
  const post = requests.find(r => r.method === 'post')
  assert.equal(post.url, '/wastes'); assert.equal(post.headers.get('Authorization'), 'Bearer fixture-access-token')
  assert.deepEqual(JSON.parse(post.data), { productId: id, lotId, quantity: 1, reason: 'Fixture' })
  assert.ok(requests.some(r => r.url === '/inventory-movements')); assert.ok(requests.some(r => r.url === '/wastes' && r.method === 'get'))
  assert.equal(requests.filter(r => r.url === '/products').length, 2)
  assert.equal(useProductsStore().products[0].stock, 5)
})
test('conteo autenticado envía solo notas y detalles; conserva diferencia y nunca ajusta stock', async () => {
  authenticate()
  queryApi.defaults.adapter = async config => { requests.push(config); return reply(config, config.method === 'post' ? count : []) }
  const result = await useRealOperationsStore().registerCount({ userId: id, notes: '', items: [{ productId: id, lotId: null, countedQuantity: 3, expectedQuantity: 999, userId: id }] })
  assert.equal(result.items[0].difference, -2)
  const post = requests.find(r => r.method === 'post')
  assert.deepEqual(JSON.parse(post.data), { notes: null, items: [{ productId: id, lotId: null, countedQuantity: 3 }] })
  assert.equal(post.url, '/inventory-counts'); assert.equal(useProductsStore().products[0].stock, 5)
})
test('doble clic de merma envía un solo POST; 500 bloquea reenvío y no muestra éxito', async () => {
  authenticate()
  let release, reached
  const gate = new Promise(resolve => { reached = resolve })
  queryApi.defaults.adapter = config => {
    requests.push(config)
    if (config.method === 'post') { reached(); return new Promise((resolve, reject) => { release = () => reject(new AxiosError('Server', 'ERR_BAD_RESPONSE', config, null, { status: 500 })) }) }
    return Promise.resolve(reply(config, []))
  }
  const store = useRealOperationsStore(), draft = { productId: id, lotId, quantity: 1, reason: 'Fixture' }
  const first = store.registerWaste(draft); await gate
  await assert.rejects(store.registerWaste(draft), /en curso/)
  release(); await assert.rejects(first, /incierto/)
  assert.equal(store.needsReview, true); await assert.rejects(store.registerWaste(draft), /incierto/)
  assert.equal(requests.filter(r => r.method === 'post').length, 1)
})
test('sin sesión, GUID o identidad de demostración no habilitan escrituras', async () => {
  const auth = useAuthStore(), store = useRealOperationsStore()
  auth.session.user = user // Deliberately no token.
  assert.equal(auth.isAuthenticated, false)
  await assert.rejects(store.registerWaste({ userId: id }), /sesión/)
  await assert.rejects(store.registerCount({ userId: id }), /sesión/)
  await assert.rejects(useCommercialStore().confirm('purchase', id), /sesión/)
  assert.equal(requests.length, 0)
})

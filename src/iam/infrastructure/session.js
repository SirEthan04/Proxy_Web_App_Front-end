import { reactive } from 'vue'
export const session = reactive({ accessToken: null, expiresAt: 0, user: null })
let timer
let revision = 0
export const sessionRevision = () => revision
export function clearSession() {
  revision++
  clearTimeout(timer)
  session.accessToken = null; session.expiresAt = 0; session.user = null
}
export function validSession() {
  if (session.accessToken && session.expiresAt <= Date.now()) clearSession()
  return !!session.accessToken && !!session.user
}
export function acceptToken(result) {
  const expiresAt = Date.parse(result?.expiresAt)
  if (typeof result?.accessToken !== 'string' || !result.accessToken || result.tokenType !== 'Bearer' || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new Error('Respuesta de autenticación no válida.')
  session.accessToken = result.accessToken; session.expiresAt = expiresAt
  clearTimeout(timer)
  timer = setTimeout(clearSession, Math.min(expiresAt - Date.now(), 2147483647))
  timer.unref?.()
}
export function acceptUser(user) {
  if (!user || typeof user.id !== 'string' || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(user.id) || typeof user.name !== 'string' || typeof user.email !== 'string' || !Number.isInteger(user.roleId) || !['Administrador', 'Empleado'].includes(user.role)) throw new Error('El backend no devolvió un usuario o rol válido.')
  session.user = { id: user.id, name: user.name, email: user.email, roleId: user.roleId, role: user.role }
}
export function requireRealSession() {
  if (!validSession()) throw new Error('La sesión ha vencido. Inicia sesión nuevamente.')
  return session.user
}

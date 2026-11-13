// Public configuration only. Shared by Vite validation and Axios clients.
export function resolveApiBase(env = {}) {
  const value = env.VITE_API_BASE_URL?.trim() || (env.PROD ? '' : 'http://localhost:5281')
  const message = 'Configuración inválida: VITE_API_BASE_URL debe ser el origen HTTPS del backend, sin /api/v1.'
  let url
  try { url = new URL(value) } catch { throw new Error(message) }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error(message)
  if (env.PROD && (url.protocol !== 'https:' || /^(localhost|127\..*|\[::1\])$/i.test(url.hostname))) throw new Error(message)
  return url.origin + '/api/v1'
}
export const apiBase = resolveApiBase(import.meta.env)
export const legacyUnavailable = 'La administración de usuarios legacy no está disponible en producción. Su integración con la API BodeGo está pendiente.'
export function guardLegacy(config, production = import.meta.env?.PROD) {
  if (production) throw new Error(legacyUnavailable)
  return config
}

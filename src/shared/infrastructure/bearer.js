import axios from 'axios'
import { session, clearSession } from '../../iam/infrastructure/session.js'
const apiBase = (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5281').replace(/\/$/, '') + '/api/v1'
const allowed = new URL(apiBase)
export function attachBearer(client) {
  client.interceptors.request.use(config => {
    const target = new URL(axios.getUri(config), apiBase + '/')
    const owned = target.origin === allowed.origin && (target.pathname === allowed.pathname || target.pathname.startsWith(allowed.pathname + '/'))
    config.headers.delete('Authorization')
    if (session.accessToken && session.expiresAt <= Date.now()) clearSession()
    if (owned && target.pathname !== allowed.pathname + '/auth/login' && session.accessToken) config.headers.set('Authorization', 'Bearer ' + session.accessToken)
    return config
  })
  client.interceptors.response.use(response => {
    const sent = response.config?.headers?.get?.('Authorization')
    if (sent && sent !== 'Bearer ' + session.accessToken) throw new Error('La sesión cambió durante la solicitud. Vuelve a consultar los datos.')
    return response
  }, error => {
    const sent = error.config?.headers?.get?.('Authorization')
    if (error.response?.status === 401 && sent && sent === 'Bearer ' + session.accessToken) clearSession()
    return Promise.reject(error)
  })
  return client
}

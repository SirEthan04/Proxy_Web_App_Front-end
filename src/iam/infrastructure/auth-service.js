import { queryApi } from '../../shared/infrastructure/query-client.js'
export const loginUser = (email, password) => queryApi.post('/auth/login', { email: email.trim(), password })
export const getCurrentUser = () => queryApi.get('/auth/me')
export function authError(error) {
  return ({ 400: 'Revisa el correo y la contraseña.', 401: 'El correo o la contraseña no son válidos, o la sesión venció.', 403: 'No tienes permisos para acceder a este recurso.', 429: 'Demasiados intentos. Espera un minuto antes de volver a intentar.' })[error.response?.status] || (error.isAxiosError ? 'No se pudo conectar con el servicio de autenticación.' : error.message)
}

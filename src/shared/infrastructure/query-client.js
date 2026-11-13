import { apiBase } from './api-config.js'
import axios from 'axios'
import { attachBearer } from './bearer.js'
export const queryApi = attachBearer(axios.create({
  baseURL: apiBase,
  timeout: 10000
}))
export function queryError(error) {
  if (error.response?.status === 401) return 'La sesión venció. Inicia sesión nuevamente.'
  if (error.response?.status === 403) return 'No tienes permisos para consultar este recurso.'
  if (!error.isAxiosError && !error.response) return 'La respuesta del backend no tiene el formato esperado. No se mostrarán cifras incompletas.'
  if (!error.response) return 'No se pudo conectar con el backend. Comprueba que esté encendido y permita CORS desde Vue.'
  return ({400: 'La consulta no es válida. Revisa las fechas y el límite.', 404: 'No se encontró el recurso solicitado.', 500: 'El servidor no pudo completar la consulta. Inténtalo nuevamente.'})[error.response.status] || 'No se pudo completar la consulta al backend.'
}

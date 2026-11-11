import axios from 'axios'
export const queryApi = axios.create({
  baseURL: (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5281').replace(/\/$/, '') + '/api/v1',
  timeout: 10000
})
export function queryError(error) {
  if (!error.isAxiosError && !error.response) return 'La respuesta del backend no tiene el formato esperado. No se mostrarán cifras incompletas.'
  if (!error.response) return 'No se pudo conectar con el backend. Comprueba que esté encendido y permita CORS desde Vue.'
  return ({400: 'La consulta no es válida. Revisa las fechas y el límite.', 404: 'No se encontró el recurso solicitado.', 500: 'El servidor no pudo completar la consulta. Inténtalo nuevamente.'})[error.response.status] || 'No se pudo completar la consulta al backend.'
}

import { inventoryApi } from '../../inventory/infrastructure/inventory-api.js'
import { requireRealSession } from '../../iam/infrastructure/session.js'

const path = kind => {
  if (!['purchase', 'sale'].includes(kind)) throw new Error('Tipo de operación no válido.')
  return kind === 'purchase' ? '/purchases' : '/sales'
}
const documentPath = (kind, id) => `${path(kind)}/${encodeURIComponent(id)}`
export const getDocuments = kind => inventoryApi.get(path(kind))
export const getDocument = (kind, id) => inventoryApi.get(documentPath(kind, id))
export const createDocument = (kind, body) => {
  requireRealSession()
  return inventoryApi.post(path(kind), { items: body.items.map(({ productId, lotId, quantity, unitAmount }) => ({ productId, lotId, quantity, unitAmount })) })
}
export const confirmDocument = (kind, id) => { requireRealSession(); return inventoryApi.post(`${documentPath(kind, id)}/confirm`) }
export const getLots = id => inventoryApi.get(`/products/${encodeURIComponent(id)}/lots`)

export function commercialError(error, writing = false) {
  const status = error.response?.status
  if (status === 401) return 'La sesión venció. Inicia sesión nuevamente.'
  if (status === 403) return 'No tienes permisos para realizar esta operación.'
  const fallback = ({400: 'Los datos de la operación no son válidos.', 404: 'No se encontró la operación o el recurso solicitado.', 409: 'Conflicto: revisa el stock, los lotes y el estado actualizado de la operación.', 500: 'El servidor no pudo completar la operación.', 503: 'El servicio no está disponible. Consulta el estado antes de reintentar.'})[status]
  const detail = error.response?.data?.detail || error.response?.data?.title
  if (fallback) return `${fallback}${typeof detail === 'string' ? ' ' + detail : ''}`
  if (!error.response && error.isAxiosError) return writing
    ? 'Se perdió la conexión. El resultado es incierto: consulta el historial antes de repetir la operación.'
    : 'No se pudo conectar con ASP.NET Core. Revisa que el backend esté encendido y permita CORS.'
  return error.message || 'No se pudo completar la operación.'
}

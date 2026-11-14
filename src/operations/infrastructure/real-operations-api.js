import { queryApi } from '../../shared/infrastructure/query-client.js'
import { getProductLots } from '../../inventory/infrastructure/inventory-api.js'
import { requireGuid } from '../domain/real-operations.js'
import { requireRealSession } from '../../iam/infrastructure/session.js'
export const getMovements = () => queryApi.get('/inventory-movements')
export const getRealWastes = () => queryApi.get('/wastes')
export const getInventoryCount = id => queryApi.get(`/inventory-counts/${encodeURIComponent(requireGuid(id))}`)
export const getLots = id => getProductLots(requireGuid(id))
export async function createRealWaste({ productId, lotId, quantity, reason }) {
  requireRealSession()
  return queryApi.post('/wastes', { productId, lotId, quantity, reason })
}
export async function createInventoryCount({ notes, items }) {
  requireRealSession()
  return queryApi.post('/inventory-counts', { notes, items: items.map(({ productId, lotId, countedQuantity }) => ({ productId, lotId, countedQuantity })) })
}
export function operationsError(error) {
  if (error.response?.status === 401) return 'La sesión venció. Inicia sesión nuevamente.'
  if (error.response?.status === 403) return 'No tienes permisos para realizar esta operación.'
  if (!error.isAxiosError && !error.response) return error.message || 'Respuesta del backend no válida.'
  if (!error.response) return 'No se pudo conectar con el backend. Comprueba que esté encendido y permita CORS desde Vue.'
  return ({ 400: 'Datos no válidos. Revisa GUID, cantidades y campos obligatorios.', 404: 'No se encontró el recurso solicitado.', 409: 'Conflicto de inventario: stock insuficiente o existencias inconsistentes. Recarga Inventory.', 500: 'El servidor no pudo completar la consulta. Inténtalo nuevamente.' })[error.response.status] || 'No se pudo completar la solicitud.'
}

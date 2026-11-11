import { queryApi } from '../../shared/infrastructure/query-client.js'
import { getProductLots } from '../../inventory/infrastructure/inventory-api.js'
import { requireGuid, WRITE_BLOCKED } from '../domain/real-operations.js'
export const getMovements = () => queryApi.get('/inventory-movements')
export const getRealWastes = () => queryApi.get('/wastes')
export const getInventoryCount = id => queryApi.get(`/inventory-counts/${encodeURIComponent(requireGuid(id))}`)
export const getLots = id => getProductLots(requireGuid(id))
// Intentionally no HTTP POST implementation: removing this guard requires IAM integration
// and explicit authorization. Neither a caller-provided GUID nor a boolean enables it.
export async function createRealWaste() { throw new Error(WRITE_BLOCKED) }
export async function createInventoryCount() { throw new Error(WRITE_BLOCKED) }
export function operationsError(error) {
  if (!error.isAxiosError && !error.response) return error.message || 'Respuesta del backend no válida.'
  if (!error.response) return 'No se pudo conectar con el backend. Comprueba que esté encendido y permita CORS desde Vue.'
  return ({ 400: 'Datos no válidos. Revisa GUID, cantidades y campos obligatorios.', 404: 'No se encontró el recurso solicitado.', 409: 'Conflicto de inventario: stock insuficiente o existencias inconsistentes. Recarga Inventory.', 500: 'El servidor no pudo completar la consulta. Inténtalo nuevamente.' })[error.response.status] || 'No se pudo completar la solicitud.'
}

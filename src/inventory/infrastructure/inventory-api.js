import { apiBase } from '../../shared/infrastructure/api-config.js'
import axios from 'axios'
import { attachBearer } from '../../shared/infrastructure/bearer.js'

// Dedicated client: Inventory must never fall back to JSON Server.
export const inventoryApi = attachBearer(axios.create({
  baseURL: apiBase,
  timeout: 10000
}))
export function inventoryError(error) {
  if (error.response?.status === 401) return 'La sesión venció. Inicia sesión nuevamente.'
  if (error.response?.status === 403) return 'No tienes permisos para realizar esta operación.'
  if (!error.response) return 'No se pudo conectar con el backend. Comprueba que esté encendido en localhost:5281 y que permita CORS desde el origen de Vue.'
  return ({400: 'Datos no válidos. Revisa los campos del formulario.', 404: 'No se encontró el recurso solicitado.', 409: 'Conflicto: el recurso ya existe o fue modificado.', 500: 'El servidor no pudo completar la operación. Inténtalo nuevamente.'})[error.response.status] || 'No se pudo completar la solicitud.'
}
export const getInventoryProducts = () => inventoryApi.get('/products')
export const getInventoryProduct = id => inventoryApi.get(`/products/${encodeURIComponent(id)}`)
export const getProductLots = id => inventoryApi.get(`/products/${encodeURIComponent(id)}/lots`)
export const getLowStockProducts = () => inventoryApi.get('/products/low-stock')
export const createInventoryProduct = product => inventoryApi.post('/products', product)
export const getCategories = () => inventoryApi.get('/categories')
export const getCategory = id => inventoryApi.get(`/categories/${encodeURIComponent(id)}`)
export const createCategory = category => inventoryApi.post('/categories', category)

import axios from 'axios'

// Dedicated client: Inventory must never fall back to JSON Server.
export const inventoryApi = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5281').replace(/\/$/, '') + '/api/v1',
  timeout: 10000
})
export function inventoryError(error) {
  if (!error.response) return 'No se pudo conectar con el backend. Comprueba que esté encendido en localhost:5281 y que permita CORS desde el origen de Vue.'
  return ({400: 'Datos no válidos. Revisa los campos del formulario.', 404: 'No se encontró el recurso solicitado.', 409: 'Conflicto: el recurso ya existe o fue modificado.', 500: 'El servidor no pudo completar la operación. Inténtalo nuevamente.'})[error.response.status] || 'No se pudo completar la solicitud.'
}
export const getInventoryProducts = () => inventoryApi.get('/products')
export const getInventoryProduct = id => inventoryApi.get(`/products/${encodeURIComponent(id)}`)
export const getLowStockProducts = () => inventoryApi.get('/products/low-stock')
export const createInventoryProduct = product => inventoryApi.post('/products', product)
export const getCategories = () => inventoryApi.get('/categories')
export const getCategory = id => inventoryApi.get(`/categories/${encodeURIComponent(id)}`)
export const createCategory = category => inventoryApi.post('/categories', category)

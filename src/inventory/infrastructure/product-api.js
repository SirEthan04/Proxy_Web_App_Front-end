import { catalogApi as api } from '../../shared/infrastructure/http-client.js'

export const getProducts = () => {
    return api.get('/products')
}

export const createProduct = (product) => {
    return api.post('/products', product)
}

export const updateProduct = (id, product) => {
    return api.put(`/products/${encodeURIComponent(String(id))}`, product)
}

export const deleteProduct = (id) => {
    return api.delete(`/products/${encodeURIComponent(String(id))}`)
}

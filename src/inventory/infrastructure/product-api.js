import axios from 'axios'

const api = axios.create({
    baseURL: 'https://6ac6bb3dbea0e72cf5c93893.mockapi.io'
})

export const getProducts = () => {
    return api.get('/products')
}

export const createProduct = (product) => {
    return api.post('/products', product)
}

export const updateProduct = (id, product) => {
    return api.put(`/products/${id}`, product)
}

export const deleteProduct = (id) => {
    return api.delete(`/products/${id}`)
}
import axios from 'axios'

export const catalogApi = axios.create({
    baseURL: import.meta.env.VITE_CATALOG_API_URL
})

export const operationsApi = axios.create({
    baseURL: import.meta.env.VITE_OPERATIONS_API_URL
})

import axios from 'axios'

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
    timeout: 10000
})

// Preserve adapter interfaces while all contexts share the same local origin.
export const catalogApi = api
export const operationsApi = api

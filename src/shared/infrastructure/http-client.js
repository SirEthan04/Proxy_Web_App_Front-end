import { guardLegacy } from './api-config.js'
import axios from 'axios'

export const api = axios.create({
    baseURL: import.meta.env?.PROD ? undefined : (import.meta.env?.VITE_LEGACY_API_BASE_URL || 'http://localhost:3001'),
    timeout: 10000
})

api.interceptors.request.use(config => guardLegacy(config))

// Preserve adapter interfaces while all contexts share the same local origin.
export const catalogApi = api
export const operationsApi = api

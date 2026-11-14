import { queryApi } from '../../shared/infrastructure/query-client.js'
export const getAlerts = () => queryApi.get('/alerts')
export const getAlert = id => queryApi.get(`/alerts/${encodeURIComponent(id)}`)

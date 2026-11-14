import { queryApi } from '../../shared/infrastructure/query-client.js'
import { reportParams } from '../domain/report-contract.js'
export function getSalesSummary(filters) {
  const { limit, ...params } = reportParams(filters)
  return queryApi.get('/reports/sales-summary', { params })
}
export const getTopProducts = filters => queryApi.get('/reports/top-products', { params: reportParams(filters) })

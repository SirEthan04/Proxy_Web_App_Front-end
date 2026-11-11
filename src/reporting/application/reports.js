import { defineStore } from 'pinia'
import { getSalesSummary, getTopProducts } from '../infrastructure/reports-api.js'
import { reportParams, adaptSummary, adaptTopProducts } from '../domain/report-contract.js'
import { queryError } from '../../shared/infrastructure/query-client.js'
export const useReportsStore = defineStore('real-reports', {
  state: () => ({ summary: null, topProducts: [], loading: false, loadError: null, appliedFilters: null }),
  actions: {
    async loadReports(filters = {}) {
      if (this.loading) return
      this.summary = null; this.topProducts = []; this.loadError = null; this.appliedFilters = null
      let params
      try { params = reportParams(filters) }
      catch (error) { this.loadError = error.message; return }
      this.loading = true
      try {
        const [summary, top] = await Promise.all([getSalesSummary(params), getTopProducts(params)])
        const adaptedSummary = adaptSummary(summary.data)
        const adaptedTop = adaptTopProducts(top.data)
        this.summary = adaptedSummary; this.topProducts = adaptedTop; this.appliedFilters = params
      } catch (error) { this.loadError = queryError(error) }
      finally { this.loading = false }
    }
  }
})

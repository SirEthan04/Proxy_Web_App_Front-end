import { defineStore } from 'pinia'
import { getAlerts, getAlert } from '../infrastructure/alerts-api.js'
import { adaptAlerts, adaptAlert } from '../infrastructure/alerts.assembler.js'
import { queryError } from '../../shared/infrastructure/query-client.js'
export const useAlertsStore = defineStore('real-alerts', {
  state: () => ({ alerts: [], loading: false, loadError: null, detail: null, detailLoading: false, detailError: null }),
  actions: {
    async loadAlerts() {
      if (this.loading) return
      this.loading = true; this.loadError = null; this.alerts = []
      try { this.alerts = adaptAlerts((await getAlerts()).data) }
      catch (error) { this.loadError = queryError(error) }
      finally { this.loading = false }
    },
    async loadDetail(id) {
      if (this.detailLoading) return
      this.detailLoading = true; this.detailError = null; this.detail = null
      try { this.detail = adaptAlert((await getAlert(id)).data) }
      catch (error) { this.detailError = queryError(error) }
      finally { this.detailLoading = false }
    }
  }
})

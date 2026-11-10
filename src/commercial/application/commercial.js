import { toRaw } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '../../iam/application/auth.js'
import { PERMISSIONS } from '../../iam/domain/permissions.js'
import { useProductsStore } from '../../inventory/application/products.js'
import { useOperationsStore } from '../../operations/application/operations.js'
import { useWasteStore } from '../../operations/application/waste.js'
import { commercialReferences } from './product-history.js'
import { registerTransaction } from './register-transaction.js'
const readPermission = kind => kind === 'purchase' ? PERMISSIONS.PURCHASES_READ : PERMISSIONS.SALES_READ
const writePermission = kind => kind === 'purchase' ? PERMISSIONS.PURCHASES_CREATE : PERMISSIONS.SALES_CREATE
const pendingLoads = new WeakMap()
export const useCommercialStore = defineStore('commercial', {
  state: () => ({ purchases: [], sales: [], loading: false, loadError: null, submitting: false, error: null, activeDocumentId: null }),
  actions: {
    clearSessionData() { pendingLoads.delete(toRaw(this.$state)); this.$reset() },
    upsert(kind, document) {
      const collection = kind === 'purchase' ? this.purchases : this.sales
      const index = collection.findIndex(item => item.id === document.id)
      if (index < 0) collection.push(JSON.parse(JSON.stringify(document)))
      else collection[index] = JSON.parse(JSON.stringify(document))
    },
    async load(kind) {
      if (!['purchase', 'sale'].includes(kind)) throw new Error('Invalid kind')
      useAuthStore().requirePermission(readPermission(kind))
      const state = toRaw(this.$state)
      if (pendingLoads.has(state)) return pendingLoads.get(state)
      this.loading = true; this.loadError = null
      const request = (async () => {
        try {
          const references = await commercialReferences()
          if (pendingLoads.get(state) !== request) return
          this.purchases = references.filter(item => item.kind === 'purchase').map(item => ({ ...item.document, localOnly: Boolean(item.localOnly) }))
          this.sales = references.filter(item => item.kind === 'sale').map(item => ({ ...item.document, localOnly: Boolean(item.localOnly) }))
        } catch (error) { if (pendingLoads.get(state) === request) this.loadError = error.messageKey || 'commercialLoadFailed'; throw error }
        finally { if (pendingLoads.get(state) === request) { this.loading = false; pendingLoads.delete(state) } }
      })()
      pendingLoads.set(state, request)
      return request
    },
    async register(kind, lines) {
      if (!['purchase', 'sale'].includes(kind)) throw new Error('Invalid kind')
      const auth = useAuthStore()
      auth.requirePermission(writePermission(kind))
      if (this.submitting || useProductsStore().saving || useOperationsStore().submitting || useOperationsStore().saving || useWasteStore().submitting || useWasteStore().saving) throw Object.assign(new Error('Busy'), { messageKey: 'requestInProgress' })
      this.submitting = true; this.error = null; this.activeDocumentId = null
      try {
        return await registerTransaction(kind, JSON.parse(JSON.stringify(lines)), auth.user, document => { this.activeDocumentId = document.id; this.upsert(kind, document) })
      } catch (error) { this.error = error.messageKey || 'commercialWriteUncertain'; throw error }
      finally { this.submitting = false }
    }
  }
})

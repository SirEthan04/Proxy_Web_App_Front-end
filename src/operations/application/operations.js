import { toRaw } from 'vue'
import { defineStore } from 'pinia'
import { getOperations, createOperation } from '../infrastructure/operation-api.js'
import { useProductsStore } from '../../inventory/application/products.js'
import { getProductStatus } from '../../inventory/domain/product.js'
import { previewOperation } from '../domain/stock-change.js'

const pendingLoads = new WeakMap()

export const useOperationsStore = defineStore('operations', {
  state: () => ({
    operations: [],
    loading: false,
    loadError: null,
    saving: false,
    error: null,
    submitting: false,
    needsReview: false
  }),
  actions: {
    clearSessionData() {
      pendingLoads.delete(toRaw(this.$state))
      this.$reset()
    },
    loadOperations() {
      // Use stable state identity across Pinia devtools action wrappers.
      const state = toRaw(this.$state)
      if (pendingLoads.has(state)) return pendingLoads.get(state)
      this.loading = true
      this.loadError = null
      const request = (async () => {
        try {
          const response = await getOperations()
          if (pendingLoads.get(state) === request) this.operations = response.data
          return response.data
        } catch (error) {
          if (pendingLoads.get(state) === request) this.loadError = 'loadOperationsFailed'
          throw error
        } finally {
          if (pendingLoads.get(state) === request) {
            this.loading = false
            pendingLoads.delete(state)
          }
        }
      })()
      pendingLoads.set(state, request)
      return request
    },
    async addOperation(operation) {
      if (this.saving) throw Object.assign(new Error('Write in progress'), { messageKey: 'requestInProgress' })
      this.saving = true
      this.error = null
      try {
        const response = await createOperation({ ...operation, date: operation.sourceId ? operation.date : new Date().toLocaleString() })
        this.operations.push(response.data)
        return response.data
      } catch (error) {
        this.error = 'operationFailed'
        throw error
      } finally {
        this.saving = false
      }
    },
    async registerOperation({ productId, quantity, type, expectedStock }) {
      const products = useProductsStore()
      const fail = key => { throw Object.assign(new Error(key), { messageKey: key }) }
      if (this.submitting || this.saving || products.saving) fail('requestInProgress')
      if (this.needsReview) fail('partialWriteWarning')
      this.submitting = true
      this.error = null
      let stockAttempted = false
      let stockUpdated = false
      try {
        // One fresh read at confirmation, before the definitive domain validation.
        await products.loadProducts()
        const product = products.products.find(item => String(item.id) === String(productId))
        if (!product) fail('productNotFound')
        if (expectedStock !== undefined && Number(product.stock) !== Number(expectedStock)) fail('stockChangedReview')
        const result = previewOperation(product.stock, quantity, type)
        if (!result.valid) fail(result.errorKey)
        stockAttempted = true
        await products.updateProduct(product.id, { ...product, stock: result.stockAfter, status: getProductStatus(result.stockAfter) })
        stockUpdated = true
        return await this.addOperation({ productId: product.id, productName: product.name, quantity: result.quantity, type })
      } catch (error) {
        // Read/validation failures are not partial writes. Lost responses and 5xx after
        // a stock attempt are uncertain; never retry them automatically.
        const uncertainStock = stockAttempted && !error.messageKey && (!error.response || error.response.status >= 500)
        if (stockUpdated || uncertainStock) {
          this.needsReview = true
          error.messageKey = 'partialWriteWarning'
        }
        this.error = error.messageKey || 'operationFailed'
        throw error
      } finally {
        this.submitting = false
      }
    }
  }
})

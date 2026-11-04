import { toRaw } from 'vue'
import { defineStore } from 'pinia'
import { getOperations, createOperation } from '../infrastructure/operation-api.js'
import { useProductsStore } from '../../inventory/application/products.js'
import { getProductStatus } from '../../inventory/domain/product.js'
import { OPERATION_TYPES } from '../domain/operation.js'

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
        const response = await createOperation({ ...operation, date: new Date().toLocaleString() })
        this.operations.push(response.data)
        return response.data
      } catch (error) {
        this.error = 'operationFailed'
        throw error
      } finally {
        this.saving = false
      }
    },
    async registerOperation({ productId, quantity, type }) {
      const products = useProductsStore()
      if (this.submitting || products.saving) throw Object.assign(new Error('Write in progress'), { messageKey: 'requestInProgress' })
      if (this.needsReview) throw Object.assign(new Error('Review required'), { messageKey: 'partialWriteWarning' })
      const product = products.products.find(item => Number(item.id) === Number(productId))
      const fail = key => { throw Object.assign(new Error(key), { messageKey: key }) }
      if (!product) fail('productNotFound')
      const amount = Number(quantity)
      if (quantity === '' || !Number.isFinite(amount) || amount <= 0) fail('positiveQuantity')
      if (!Object.values(OPERATION_TYPES).includes(type)) fail('requiredFields')
      if (type === OPERATION_TYPES.EXIT && amount > Number(product.stock)) fail('insufficientStock')
      const newStock = Number(product.stock) + (type === OPERATION_TYPES.ENTRY ? amount : -amount)
      this.submitting = true
      this.error = null
      let stockUpdated = false
      try {
        await products.updateProduct(product.id, { ...product, stock: newStock, status: getProductStatus(newStock) })
        stockUpdated = true
        return await this.addOperation({ productId: product.id, productName: product.name, quantity: amount, type })
      } catch (error) {
        // A lost response may also mean that the stock update reached the server.
        if (stockUpdated || !error.response) {
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

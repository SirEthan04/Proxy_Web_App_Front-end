import { toRaw } from 'vue'
import { defineStore } from 'pinia'
import { getWastes, createWaste } from '../infrastructure/waste-api.js'
import { useProductsStore } from '../../inventory/application/products.js'
import { getProductStatus } from '../../inventory/domain/product.js'
import { previewWaste } from '../domain/stock-change.js'

const pendingLoads = new WeakMap()

export const useWasteStore = defineStore('waste', {
  state: () => ({
    wastes: [],
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
    loadWastes() {
      // Use stable state identity across Pinia devtools action wrappers.
      const state = toRaw(this.$state)
      if (pendingLoads.has(state)) return pendingLoads.get(state)
      this.loading = true
      this.loadError = null
      const request = (async () => {
        try {
          const response = await getWastes()
          if (pendingLoads.get(state) === request) this.wastes = response.data
          return response.data
        } catch (error) {
          if (pendingLoads.get(state) === request) this.loadError = 'loadWastesFailed'
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
    async addWaste(waste) {
      if (this.saving) throw Object.assign(new Error('Write in progress'), { messageKey: 'requestInProgress' })
      this.saving = true
      this.error = null
      try {
        const response = await createWaste({ ...waste, date: new Date().toLocaleString() })
        this.wastes.push(response.data)
        return response.data
      } catch (error) {
        this.error = 'wasteFailed'
        throw error
      } finally {
        this.saving = false
      }
    },
    async registerWaste({ productId, quantity, reason, expectedStock }) {
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
        const result = previewWaste(product.stock, quantity, reason)
        if (!result.valid) fail(result.errorKey)
        stockAttempted = true
        await products.updateProduct(product.id, { ...product, stock: result.stockAfter, status: getProductStatus(result.stockAfter) })
        stockUpdated = true
        return await this.addWaste({ productId: product.id, productName: product.name, quantity: result.quantity, reason })
      } catch (error) {
        // Read/validation failures are not partial writes. Lost responses and 5xx after
        // a stock attempt are uncertain; never retry them automatically.
        const uncertainStock = stockAttempted && !error.messageKey && (!error.response || error.response.status >= 500)
        if (stockUpdated || uncertainStock) {
          this.needsReview = true
          error.messageKey = 'partialWriteWarning'
        }
        this.error = error.messageKey || 'wasteFailed'
        throw error
      } finally {
        this.submitting = false
      }
    }
  }
})

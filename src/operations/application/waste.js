import { toRaw } from 'vue'
import { defineStore } from 'pinia'
import { getWastes, createWaste } from '../infrastructure/waste-api.js'
import { useProductsStore } from '../../inventory/application/products.js'
import { getProductStatus } from '../../inventory/domain/product.js'
import { WASTE_REASONS } from '../domain/waste.js'

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
    async registerWaste({ productId, quantity, reason }) {
      const products = useProductsStore()
      if (this.submitting || products.saving) throw Object.assign(new Error('Write in progress'), { messageKey: 'requestInProgress' })
      if (this.needsReview) throw Object.assign(new Error('Review required'), { messageKey: 'partialWriteWarning' })
      const product = products.products.find(item => Number(item.id) === Number(productId))
      const fail = key => { throw Object.assign(new Error(key), { messageKey: key }) }
      if (!product) fail('productNotFound')
      const amount = Number(quantity)
      if (quantity === '' || !Number.isFinite(amount) || amount <= 0) fail('positiveQuantity')
      if (!WASTE_REASONS.includes(reason)) fail('requiredFields')
      if (amount > Number(product.stock)) fail('wasteExceedsStock')
      const newStock = Number(product.stock) - amount
      this.submitting = true
      this.error = null
      let stockUpdated = false
      try {
        await products.updateProduct(product.id, { ...product, stock: newStock, status: getProductStatus(newStock) })
        stockUpdated = true
        return await this.addWaste({ productId: product.id, productName: product.name, quantity: amount, reason })
      } catch (error) {
        // A lost response may also mean that the stock update reached the server.
        if (stockUpdated || !error.response) {
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

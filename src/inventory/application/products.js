import { toRaw } from 'vue'
import { defineStore } from 'pinia'
import { getProducts, createProduct, updateProduct as updateProductApi, deleteProduct as deleteProductApi } from '../infrastructure/product-api.js'

const pendingLoads = new WeakMap()

export const useProductsStore = defineStore('products', {
  state: () => ({
    products: [],
    loading: false,
    loadError: null,
    saving: false,
    error: null
  }),
  actions: {
    clearSessionData() {
      pendingLoads.delete(toRaw(this.$state))
      this.$reset()
    },
    loadProducts() {
      // Use stable state identity across Pinia devtools action wrappers.
      const state = toRaw(this.$state)
      if (pendingLoads.has(state)) return pendingLoads.get(state)
      this.loading = true
      this.loadError = null
      const request = (async () => {
        try {
          const response = await getProducts()
          if (pendingLoads.get(state) === request) this.products = response.data
          return response.data
        } catch (error) {
          if (pendingLoads.get(state) === request) this.loadError = 'loadProductsFailed'
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
    async addProduct(product) {
      if (this.saving) throw Object.assign(new Error('Write in progress'), { messageKey: 'requestInProgress' })
      this.saving = true
      this.error = null
      try {
        const response = await createProduct(product)
        this.products.push(response.data)
        return response.data
      } catch (error) {
        this.error = 'createProductFailed'
        throw error
      } finally {
        this.saving = false
      }
    },
    async updateProduct(id, product) {
      if (this.saving) throw Object.assign(new Error('Write in progress'), { messageKey: 'requestInProgress' })
      this.saving = true
      this.error = null
      try {
        const response = await updateProductApi(id, product)
        const index = this.products.findIndex(item => Number(item.id) === Number(id))
        if (index !== -1) this.products[index] = response.data
        return response.data
      } catch (error) {
        this.error = 'updateProductFailed'
        throw error
      } finally {
        this.saving = false
      }
    },
    async deleteProduct(id) {
      if (this.saving) throw Object.assign(new Error('Write in progress'), { messageKey: 'requestInProgress' })
      this.saving = true
      this.error = null
      try {
        await deleteProductApi(id)
        this.products = this.products.filter(product => Number(product.id) !== Number(id))
      } catch (error) {
        this.error = 'deleteProductFailed'
        throw error
      } finally {
        this.saving = false
      }
    }
  }
})

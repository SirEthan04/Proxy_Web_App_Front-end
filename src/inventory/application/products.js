import { useAuthStore } from '../../iam/application/auth.js'
import { PERMISSIONS } from '../../iam/domain/permissions.js'
import { hasProductHistory } from '../../operations/application/product-history.js'
import { getProductValidationError } from '../domain/product-validation.js'
import { getProductStatus } from '../domain/product.js'
import { toRaw } from 'vue'
import { defineStore } from 'pinia'
import { getProducts, createProduct, updateProduct as updateProductApi, deleteProduct as deleteProductApi } from '../infrastructure/product-api.js'

const pendingLoads = new WeakMap()
const fail = key => { throw Object.assign(new Error(key), { messageKey: key }) }

async function persistProduct(store, id, product) {
  const response = await updateProductApi(id, product)
  const index = store.products.findIndex(item => String(item.id) === String(id))
  if (index !== -1) store.products[index] = response.data
  return response.data
}

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
      useAuthStore().requirePermission(PERMISSIONS.PRODUCTS_CREATE)
      const validationError = getProductValidationError(product)
      if (validationError) fail(validationError)
      if (this.saving) throw Object.assign(new Error('Write in progress'), { messageKey: 'requestInProgress' })
      this.saving = true
      this.error = null
      try {
        const response = await createProduct({
          ...product, name: product.name.trim(), category: product.category.trim(),
          price: Number(product.price), stock: Number(product.stock), status: getProductStatus(Number(product.stock))
        })
        this.products.push(response.data)
        return response.data
      } catch (error) {
        this.error = 'createProductFailed'
        throw error
      } finally {
        this.saving = false
      }
    },
    async updateProductDetails(id, details) {
      useAuthStore().requirePermission(PERMISSIONS.PRODUCTS_EDIT)
      const validationError = getProductValidationError(details, { includeStock: false })
      if (validationError) fail(validationError)
      if (this.saving) fail('requestInProgress')
      this.saving = true
      this.error = null
      try {
        // Read current stock immediately before editing the catalog; never use form stock.
        const response = await getProducts()
        const current = response.data.find(item => String(item.id) === String(id))
        if (!current) fail('productNotFound')
        return await persistProduct(this, id, {
          ...current, name: details.name.trim(), category: details.category.trim(),
          price: Number(details.price), expirationDate: details.expirationDate
        })
      } catch (error) {
        this.error = error.messageKey || 'updateProductFailed'
        throw error
      } finally {
        this.saving = false
      }
    },
    async updateProduct(id, product) {
      const auth = useAuthStore()
      // Operational callers can update stock/status, never catalog fields.
      if (!auth.can(PERMISSIONS.PRODUCTS_EDIT)) {
        if (!auth.can(PERMISSIONS.OPERATIONS_WRITE) && !auth.can(PERMISSIONS.WASTE_WRITE)) fail('accessDeniedMessage')
        const current = this.products.find(item => String(item.id) === String(id))
        if (!current) fail('productNotFound')
        const fields = new Set([...Object.keys(current), ...Object.keys(product)])
        for (const field of fields) {
          if (!['stock', 'status'].includes(field) && product[field] !== current[field]) fail('accessDeniedMessage')
        }
      }
      if (!Number.isFinite(Number(product.stock)) || Number(product.stock) < 0) fail('invalidProductStock')
      if (this.saving) throw Object.assign(new Error('Write in progress'), { messageKey: 'requestInProgress' })
      this.saving = true
      this.error = null
      try {
        return await persistProduct(this, id, product)
      } catch (error) {
        this.error = 'updateProductFailed'
        throw error
      } finally {
        this.saving = false
      }
    },
    async deleteProduct(id) {
      useAuthStore().requirePermission(PERMISSIONS.PRODUCTS_DELETE)
      if (this.saving) throw Object.assign(new Error('Write in progress'), { messageKey: 'requestInProgress' })
      this.saving = true
      this.error = null
      try {
        if (await hasProductHistory(id)) fail('productHasHistory')
        await deleteProductApi(id)
        this.products = this.products.filter(product => String(product.id) !== String(id))
      } catch (error) {
        this.error = error.messageKey || 'deleteProductFailed'
        throw error
      } finally {
        this.saving = false
      }
    }
  }
})

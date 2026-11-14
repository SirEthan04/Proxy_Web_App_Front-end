import { defineStore } from 'pinia'
import { useAuthStore } from '../../iam/application/auth.js'
import { PERMISSIONS } from '../../iam/domain/permissions.js'
import * as api from '../infrastructure/inventory-api.js'
export const useProductsStore = defineStore('real-inventory', {
  state: () => ({ products: [], categories: [], lowStockIds: [], loading: false, saving: false, loadError: null, error: null }),
  actions: {
    adapt(product) {
      return { ...product, price: product.salePrice, category: this.categories.find(c => c.id === product.categoryId)?.name || '', status: product.stock <= 0 ? 'Sin stock' : product.stock <= product.minimumStock ? 'Stock bajo' : 'Activo' }
    },
    async loadProducts(id = null) {
      this.loading = true
      this.loadError = null
      try {
        const [categories, products, low] = await Promise.all([api.getCategories(), id ? api.getInventoryProduct(id) : api.getInventoryProducts(), api.getLowStockProducts()])
        this.categories = categories.data
        this.products = (id ? [products.data] : products.data).map(p => this.adapt(p))
        this.lowStockIds = low.data.map(p => p.id)
      } catch (error) { this.loadError = api.inventoryError(error); throw error }
      finally { this.loading = false }
    },
    async addProduct(product) {
      useAuthStore().requirePermission(PERMISSIONS.PRODUCTS_CREATE)
      if (this.saving) throw new Error('Solicitud en curso.')
      this.saving = true
      try {
        if (!product.name?.trim() || product.name.trim().length > 150 || !this.categories.some(c => c.id === product.categoryId && c.active) || product.price === '' || !Number.isFinite(Number(product.price)) || Number(product.price) < 0 || Number(product.price) > 9999999999.99 || !Number.isInteger(Number(product.minimumStock)) || Number(product.minimumStock) < 0 || Number(product.minimumStock) > 2147483647 || product.minimumStock === '') throw new Error('Revisa nombre, categoría, precio y stock mínimo (entero no negativo).')
        const response = await api.createInventoryProduct({ name: product.name.trim(), categoryId: product.categoryId, salePrice: Number(product.price), minimumStock: Number(product.minimumStock) })
        this.products.push(this.adapt(response.data))
        return response.data
      } catch (error) { this.error = error.isAxiosError ? api.inventoryError(error) : error.message; throw new Error(this.error) }
      finally { this.saving = false }
    },
    async addCategory(name, description) {
      useAuthStore().requirePermission(PERMISSIONS.PRODUCTS_CREATE)
      if (this.saving) throw new Error('Solicitud en curso.')
      if (!name.trim() || name.trim().length > 100 || description.length > 255) throw new Error('Revisa el nombre (máximo 100) y la descripción (máximo 255).')
      this.saving = true
      try {
        const response = await api.createCategory({ name: name.trim(), description: description.trim() || null })
        this.categories.push(response.data)
        return response.data
      } catch (error) { throw new Error(api.inventoryError(error)) }
      finally { this.saving = false }
    }
  }
})

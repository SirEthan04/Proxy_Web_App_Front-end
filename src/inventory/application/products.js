import { t } from '../../i18n.js'
import { defineStore } from 'pinia'

import {
    getProducts,
    createProduct,
    updateProduct as updateProductApi,
    deleteProduct as deleteProductApi
} from '../infrastructure/product-api.js'

export const useProductsStore = defineStore('products', {
    state: () => ({
        products: []
    }),

    actions: {
        async loadProducts() {
            try {
                const response = await getProducts()
                this.products = response.data
            } catch (error) {
                console.error('Error cargando productos:', error)
            }
        },

        async addProduct(product) {
            try {
                const response = await createProduct(product)

                this.products.push(response.data)
            } catch (error) {
                console.error('Error creando producto:', error)
                alert(t('createProductFailed'))
            }
        },

        async updateProduct(id, product) {
            try {
                const response = await updateProductApi(id, product)

                const index = this.products.findIndex(
                    item => Number(item.id) === Number(id)
                )

                if (index !== -1) {
                    this.products[index] = response.data
                }
            } catch (error) {
                console.error('Error actualizando producto:', error)
                alert(t('updateProductFailed'))
            }
        },

        async deleteProduct(id) {
            try {
                await deleteProductApi(id)

                this.products = this.products.filter(
                    product => Number(product.id) !== Number(id)
                )
            } catch (error) {
                console.error('Error eliminando producto:', error)
                alert(t('deleteProductFailed'))
            }
        }
    }
})
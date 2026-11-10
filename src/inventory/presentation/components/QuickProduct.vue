<script setup>
import { ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { t, translateValue } from '../../../i18n.js'
import { useProductsStore } from '../../application/products.js'
import { PRODUCT_CATEGORIES, getProductValidationError } from '../../domain/product-validation.js'
const props = defineProps({ initialName: String, disabled: Boolean })
const emit = defineEmits(['created', 'cancel'])
const products = useProductsStore()
const product = ref({ name: props.initialName || '', category: '', price: '', stock: 0, expirationDate: '' })
const error = ref(null)
async function save() {
  if (props.disabled || products.saving) return
  error.value = getProductValidationError(product.value)
  if (error.value) return
  try { emit('created', await products.addProduct({ ...product.value, stock: 0 })) }
  catch (cause) { error.value = cause.messageKey || 'createProductFailed' }
}
</script>
<template>
  <form class="panel form-grid" @submit.prevent="save">
    <h2 class="span-2">{{ t('newProduct') }}</h2>
    <p class="span-2">{{ t('zeroStockProduct') }}</p>
    <div class="field"><label for="quick-name">{{ t('name') }}</label><InputText id="quick-name" v-model="product.name" :disabled="disabled" /></div>
    <div class="field"><label for="quick-category">{{ t('category') }}</label><select id="quick-category" v-model="product.category" :disabled="disabled"><option value="">{{ t('selectCategory') }}</option><option v-for="category in PRODUCT_CATEGORIES" :key="category" :value="category">{{ translateValue(category) }}</option></select></div>
    <div class="field"><label for="quick-price">{{ t('price') }}</label><InputText id="quick-price" v-model="product.price" type="number" min="0" step="0.01" :disabled="disabled" /></div>
    <div class="field"><label for="quick-expiry">{{ t('expirationDate') }}</label><InputText id="quick-expiry" v-model="product.expirationDate" type="date" :disabled="disabled" /></div>
    <p v-if="error" role="alert">{{ t(error) }}</p>
    <div class="form-actions"><Button type="button" :disabled="disabled" @click="emit('cancel')">{{ t('cancel') }}</Button><Button type="submit" :disabled="disabled" :loading="products.saving">{{ t('saveProduct') }}</Button></div>
  </form>
</template>

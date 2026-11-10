<script setup>
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'

import { t, translateValue } from '../../i18n.js'
import { ref, computed, watch } from 'vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import { useRoute, useRouter } from 'vue-router'
import { useProductsStore } from '../application/products.js'
import { PRODUCT_CATEGORIES, getProductValidationError } from '../domain/product-validation.js'

const router = useRouter()
const route = useRoute()
const productsStore = useProductsStore()
const toast = useToast()
const notify = (severity, key) => toast.add({
  severity,
  summary: t(severity === 'success' ? 'successTitle' : 'errorTitle'),
  detail: t(key),
  life: severity === 'success' ? 4000 : 8000
})
const name = ref('')
const category = ref('')
const price = ref('')
const stock = ref('')
const expirationDate = ref('')
const busy = computed(() => productsStore.saving)

const id = computed(() => String(route.params.id))
const loaded = ref(false)
const missing = ref(false)
const loadData = async () => {
  const requestedId = id.value
  loaded.value = false
  missing.value = false
  try {
    await productsStore.loadProducts()
    if (requestedId !== id.value) return
    const product = productsStore.products.find(product => String(product.id) === requestedId)
    if (!product) { missing.value = true; return }
    name.value = product.name
    category.value = product.category
    price.value = product.price
    stock.value = product.stock
    expirationDate.value = product.expirationDate
    loaded.value = true
  } catch { /* The load error is shown with a manual retry. */ }
}
watch(id, loadData, { immediate: true })

const updateProduct = async () => {
  if (busy.value || !loaded.value) return
  const details = { name: name.value, category: category.value, price: price.value, expirationDate: expirationDate.value }
  const validationError = getProductValidationError(details, { includeStock: false })
  if (validationError) { notify('error', validationError); return }
  try {
    await productsStore.updateProductDetails(id.value, details)
    notify('success', 'productUpdated')
    await router.push('/products')
  } catch (error) { notify('error', error.messageKey || productsStore.error || 'updateProductFailed') }
}
</script>

<template>
  <AppLayout>
    <div class="content">
      <PageHeader :title="t('editProduct')" :description="t('editProductSubtitle')" />
      <RequestState :loading="productsStore.loading" :error="productsStore.loadError" @retry="loadData" />
      <p v-if="missing" role="alert">{{ t('productNotFound') }}</p>
      <form v-if="loaded" class="panel form-grid" @submit.prevent="updateProduct" novalidate>
        <div class="form-intro">
          <h2>{{ t('productInformation') }}</h2>
          <p>{{ t('productFormHint') }}</p>
        </div>
        <div class="span-2">
          <div class="field">
            <label for="product-name">{{ t('name') }}</label>
            <InputText
              id="product-name"
              v-model="name"
              :disabled="busy"
              type="text"
              autocomplete="off"
              aria-required="true"
            />
          </div>
        </div>
        <div class="field">
          <label for="product-category">{{ t('category') }}</label>
          <select id="product-category" v-model="category" :disabled="busy" aria-required="true">
            <option v-if="category && !PRODUCT_CATEGORIES.includes(category)" :value="category">{{ translateValue(category) }}</option>
            <option v-for="item in PRODUCT_CATEGORIES" :key="item" :value="item">{{ translateValue(item) }}</option>
          </select>
        </div>
        <div class="field">
          <label for="product-price">{{ t('price') }}</label>
          <InputText
            id="product-price"
            v-model="price"
            :disabled="busy"
            type="number"
            min="0"
            step="any"
            inputmode="decimal"
            aria-required="true"
          />
        </div>
        <div class="field">
          <label for="product-stock">{{ t('stock') }}</label>
          <InputText id="product-stock" :value="stock" type="number" readonly aria-describedby="stock-hint" />
          <small id="stock-hint">{{ t('stockReadOnlyHint') }}</small>
        </div>
        <div class="field">
          <label for="product-expiry">{{ t('expirationDate') }}</label>
          <InputText id="product-expiry" v-model="expirationDate" :disabled="busy" type="date" aria-required="true" />
        </div>
        <div class="form-actions">
          <Button type="button" class="cancel-btn" :disabled="busy" @click="router.push('/products')">{{ t('cancel') }}</Button>
          <Button type="submit" class="save-btn" :disabled="busy" :loading="busy">{{ t('saveChanges') }}</Button>
        </div>
      </form>
    </div>
  </AppLayout>
</template>

<script setup>
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'

import { t, translateValue } from '../../i18n.js'
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import { useRouter } from 'vue-router'
import { useProductsStore } from '../application/products.js'
import { PRODUCT_CATEGORIES, getProductValidationError } from '../domain/product-validation.js'

const router = useRouter()
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

const saveProduct = async () => {
  if (busy.value) return
  const product = { name: name.value, category: category.value, price: price.value, stock: stock.value, expirationDate: expirationDate.value }
  const validationError = getProductValidationError(product)
  if (validationError) { notify('error', validationError); return }
  try {
    await productsStore.addProduct(product)
    notify('success', 'productCreated')
    await router.push('/products')
  } catch (error) { notify('error', error.messageKey || productsStore.error || 'createProductFailed') }
}
</script>

<template>
  <AppLayout>
    <div class="content">
      <PageHeader :title="t('newProduct')" :description="t('newProductSubtitle')" />
      <form class="panel form-grid" @submit.prevent="saveProduct" novalidate>
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
            <option value="">{{ t('selectCategory') }}</option>
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
          <InputText
            id="product-stock"
            v-model="stock"
            :disabled="busy"
            type="number"
            inputmode="decimal"
            step="any"
            aria-required="true"
          />
        </div>
        <div class="field">
          <label for="product-expiry">{{ t('expirationDate') }}</label>
          <InputText id="product-expiry" v-model="expirationDate" :disabled="busy" type="date" aria-required="true" />
        </div>
        <div class="form-actions">
          <Button type="button" class="cancel-btn" :disabled="busy" @click="router.push('/products')">{{ t('cancel') }}</Button>
          <Button type="submit" class="save-btn" :disabled="busy" :loading="busy">{{ t('saveProduct') }}</Button>
        </div>
      </form>
    </div>
  </AppLayout>
</template>

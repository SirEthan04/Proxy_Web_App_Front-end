<script setup>
import { t, translateValue } from '../../i18n.js'
import { ref, computed, watch } from 'vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import Sidebar from '../../shared/presentation/components/Sidebar.vue'
import Header from '../../shared/presentation/components/Header.vue'
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
  <div class="layout">

    <Sidebar />

    <div class="main">

      <Header />

      <div class="content">

        <h1>{{ t('editProduct') }}</h1>
        <p>{{ t('editProductSubtitle') }}</p>

        <p v-if="productsStore.loading" role="status">{{ t('loadingData') }}</p>
        <div v-else-if="productsStore.loadError" role="alert">
          <p>{{ t(productsStore.loadError) }}</p><Button @click="loadData">{{ t('retry') }}</Button>
        </div>
        <p v-else-if="missing" role="alert">{{ t('productNotFound') }}</p>
        <div v-if="loaded" class="form-box">

          <label>{{ t('name') }}</label>
          <InputText :disabled="busy"
              v-model="name"
              type="text" />

          <label>{{ t('category') }}</label>
          <select v-model="category" :disabled="busy">
            <option v-if="category && !PRODUCT_CATEGORIES.includes(category)" :value="category">{{ translateValue(category) }}</option>
            <option v-for="item in PRODUCT_CATEGORIES" :key="item" :value="item">{{ translateValue(item) }}</option>
          </select>

          <label>{{ t('price') }}</label>
          <input :disabled="busy"
              v-model="price"
              type="number" min="0"
              step="any"
          >

          <label>{{ t('stock') }}</label>
          <input :value="stock" type="number" readonly :aria-label="t('stock')">
          <small>{{ t('stockReadOnlyHint') }}</small>

          <label>{{ t('expirationDate') }}</label>
          <input :disabled="busy"
              v-model="expirationDate"
              type="date"
          >

          <div class="buttons">
            <Button
                class="cancel-btn" :disabled="busy"
                @click="router.push('/products')"
            >
              {{ t('cancel') }}
            </Button>

            <Button
                class="save-btn"
                :disabled="busy" :loading="busy"
                @click="updateProduct"
            >
              {{ t('saveChanges') }}
            </Button>
          </div>

        </div>

      </div>

    </div>

  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}

.main {
  flex: 1;
  background: #f4f7fb;
}

.content {
  padding: 30px;
}

.content p {
  color: #64748b;
}

.form-box {
  margin-top: 25px;
  background: white;
  padding: 25px;
  border-radius: 10px;
  max-width: 600px;
}

label {
  display: block;
  margin-top: 15px;
  margin-bottom: 7px;
}

input,
select {
  width: 100%;
  padding: 11px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
}

.cancel-btn {
  background-color: #6b7280;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 6px;
  cursor: pointer;
}

.save-btn {
  background-color: #16a34a;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 6px;
  cursor: pointer;
}

.cancel-btn:hover {
  background-color: #4b5563;
}

.save-btn:hover {
  background-color: #15803d;
}
</style>
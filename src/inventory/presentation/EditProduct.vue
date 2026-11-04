<script setup>
import { t } from '../../i18n.js'
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import Sidebar from '../../shared/presentation/components/Sidebar.vue'
import Header from '../../shared/presentation/components/Header.vue'
import InputText from 'primevue/inputtext'
import { useRoute, useRouter } from 'vue-router'
import { useProductsStore } from '../application/products.js'
import { getProductStatus } from '../domain/product.js'

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

const id = Number(route.params.id)
const loaded = ref(false)
const missing = ref(false)
const loadData = async () => {
  loaded.value = false
  missing.value = false
  try {
    await productsStore.loadProducts()
    const product = productsStore.products.find(product => Number(product.id) === id)
    if (!product) { missing.value = true; return }
    name.value = product.name
    category.value = product.category
    price.value = product.price
    stock.value = product.stock
    expirationDate.value = product.expirationDate
    loaded.value = true
  } catch { /* The load error is shown with a manual retry. */ }
}
onMounted(loadData)

const updateProduct = async () => {
  if (busy.value || !loaded.value) return
  if (!name.value || !category.value || price.value === '' || stock.value === '' || !expirationDate.value) { notify('error', 'requiredFields'); return }
  try {
    await productsStore.updateProduct(id,{
      name: name.value, category: category.value, price: Number(price.value), stock: Number(stock.value),
      expirationDate: expirationDate.value, status: getProductStatus(Number(stock.value))
    })
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
            <option value="Bebidas">
              {{ t('beverages') }}
            </option>

            <option value="Lácteos">
              {{ t('dairy') }}
            </option>

            <option value="Panadería">
              {{ t('bakery') }}
            </option>

            <option value="Abarrotes">
              {{ t('groceries') }}
            </option>

            <option value="Galletas">
              {{ t('cookies') }}
            </option>

            <option value="Conservas">
              {{ t('cannedGoods') }}
            </option>

            <option value="Dulces">
              {{ t('sweets') }}
            </option>
          </select>

          <label>{{ t('price') }}</label>
          <input :disabled="busy"
              v-model="price"
              type="number"
              step="0.01"
          >

          <label>{{ t('stock') }}</label>
          <input :disabled="busy"
              v-model="stock"
              type="number"
          >

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
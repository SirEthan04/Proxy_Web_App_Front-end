<template>
  <div class="page">
    <Sidebar />

    <main class="main-content">
      <Header />

      <div class="content">
        <div class="title-row">
          <div>
            <h1>{{ t('products') }}</h1>
            <p>{{ t('productsSubtitle') }}</p>
          </div>

          <Button
              class="new-btn"
              @click="$router.push('/products/new')"
          >
            {{ t('addProduct') }}
          </Button>
        </div>

        <div class="filters">
          <InputText
              v-model="search"
              type="text"
              :placeholder="t('searchProduct')" />

          <select v-model="selectedCategory">
            <option value="Todas">{{ t('allCategories') }}</option>
            <option value="Bebidas">{{ t('beverages') }}</option>
            <option value="Lácteos">{{ t('dairy') }}</option>
            <option value="Panadería">{{ t('bakery') }}</option>
            <option value="Abarrotes">{{ t('groceries') }}</option>
            <option value="Galletas">{{ t('cookies') }}</option>
            <option value="Conservas">{{ t('cannedGoods') }}</option>
            <option value="Dulces">{{ t('sweets') }}</option>
            <option value="Limpieza">{{ t('cleaning') }}</option>
            <option value="Snacks">{{ t('snacks') }}</option>
          </select>
        </div>

        <p v-if="loading" role="status">{{ t('loadingData') }}</p>
        <div v-else-if="loadError" role="alert">
          <p>{{ t(loadError) }}</p><Button @click="loadData">{{ t('retry') }}</Button>
        </div>
        <table v-if="dataReady">
          <thead>
          <tr>
            <th>{{ t('id') }}</th>
            <th>{{ t('product') }}</th>
            <th>{{ t('category') }}</th>
            <th>{{ t('price') }}</th>
            <th>{{ t('stock') }}</th>
            <th>{{ t('status') }}</th>
            <th>{{ t('actions') }}</th>
          </tr>
          </thead>

          <tbody>
          <tr
              v-for="product in filteredProducts"
              :key="product.id"
          >
            <td>{{ product.id }}</td>
            <td>{{ product.name }}</td>
            <td>{{ translateValue(product.category) }}</td>
            <td>S/ {{ product.price }}</td>
            <td>{{ product.stock }}</td>
            <td>{{ translateValue(product.status) }}</td>

            <td>
              <Button
                  class="edit-btn"
                  @click="$router.push(`/products/edit/${product.id}`)"
              >
                {{ t('edit') }}
              </Button>

              <Button
                  class="delete-btn"
                  @click="deleteProduct(product.id)" :disabled="productsStore.saving"
              >
                {{ t('delete') }}
              </Button>
            </td>
          </tr>

          <tr v-if="filteredProducts.length === 0">
            <td colspan="7" class="empty">
              {{ t('noProducts') }}
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>

<script setup>
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { t, translateValue } from '../../i18n.js'

import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'

import Sidebar from '../../shared/presentation/components/Sidebar.vue'
import Header from '../../shared/presentation/components/Header.vue'
import { useProductsStore } from '../application/products.js'

const productsStore = useProductsStore()

const search = ref('')
const selectedCategory = ref('Todas')

const filteredProducts = computed(() => {
  return productsStore.products.filter(product => {

    const matchesSearch = product.name
        .toLowerCase()
        .includes(search.value.toLowerCase())

    const matchesCategory =
        selectedCategory.value === 'Todas' ||
        product.category === selectedCategory.value

    return matchesSearch && matchesCategory
  })
})

const toast = useToast()
const notify = (severity, key) => toast.add({
  severity,
  summary: t(severity === 'success' ? 'successTitle' : 'errorTitle'),
  detail: t(key),
  life: severity === 'success' ? 4000 : 8000
})
const loading = computed(() => productsStore.loading)
const loadError = computed(() => productsStore.loadError)
const dataReady = computed(() => !loading.value && !loadError.value)
const loadData = async () => {
  await Promise.allSettled([productsStore.loadProducts()])
}
onMounted(loadData)
const deleteProduct = async id => {
  if (productsStore.saving) return
  try { await productsStore.deleteProduct(id); notify('success', 'productDeleted') }
  catch (error) { notify('error', error.messageKey || productsStore.error || 'deleteProductFailed') }
}
</script>

<style scoped>
.page {
  display: flex;
}

.main-content {
  flex: 1;
}

.content {
  padding: 30px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filters {
  display: flex;
  gap: 15px;
  margin: 25px 0;
}

.filters input,
.filters select {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.filters input {
  width: 250px;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

th,
td {
  padding: 12px;
  border-bottom: 1px solid #ddd;
  text-align: left;
}

.new-btn {
  background-color: #2563eb;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.new-btn:hover {
  background-color: #1d4ed8;
}

.edit-btn {
  background-color: #f59e0b;
  color: white;
  border: none;
  padding: 7px 12px;
  border-radius: 5px;
  cursor: pointer;
  margin-right: 5px;
}

.edit-btn:hover {
  background-color: #d97706;
}

.delete-btn {
  background-color: #dc2626;
  color: white;
  border: none;
  padding: 7px 12px;
  border-radius: 5px;
  cursor: pointer;
}

.delete-btn:hover {
  background-color: #b91c1c;
}
.empty {
  text-align: center;
  padding: 30px;
}
</style>
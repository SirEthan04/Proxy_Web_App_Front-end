<script setup>
import Button from 'primevue/button'
import { t } from '../../i18n.js'

import { computed, onMounted } from 'vue'

import Sidebar from '../../shared/presentation/components/Sidebar.vue'
import Header from '../../shared/presentation/components/Header.vue'
import { useProductsStore } from '../../inventory/application/products.js'

import {
  getOutOfStockProducts,
  getLowStockProducts,
  getExpiredProducts,
  getExpiringProducts
} from '../application/alerts.js'

const productsStore = useProductsStore()

const loading = computed(() => productsStore.loading)
const loadError = computed(() => productsStore.loadError)
const dataReady = computed(() => !loading.value && !loadError.value)
const loadData = async () => {
  await Promise.allSettled([productsStore.loadProducts()])
}
onMounted(loadData)

const outOfStockProducts = computed(() => {
  return getOutOfStockProducts(productsStore.products)
})

const lowStockProducts = computed(() => {
  return getLowStockProducts(productsStore.products)
})

const expiredProducts = computed(() => {
  return getExpiredProducts(productsStore.products)
})

const expiringProducts = computed(() => {
  return getExpiringProducts(productsStore.products)
})
</script>

<template>
  <div class="page">
    <Sidebar />

    <main class="main-content">
      <Header />

      <div class="content">
        <h1>{{ t('alerts') }}</h1>
        <p>{{ t('alertsSubtitle') }}</p>
        <p v-if="loading" role="status">{{ t('loadingData') }}</p>
        <div v-else-if="loadError" role="alert">
          <p>{{ t(loadError) }}</p><Button @click="loadData">{{ t('retry') }}</Button>
        </div>
        <template v-if="dataReady">

        <div class="alerts-grid">

          <div class="alert-card danger">
            <h2>{{ t('outOfStock') }}</h2>
            <p class="number">
              {{ outOfStockProducts.length }}
            </p>
          </div>

          <div class="alert-card warning">
            <h2>{{ t('lowStock') }}</h2>
            <p class="number">
              {{ lowStockProducts.length }}
            </p>
          </div>

          <div class="alert-card orange">
            <h2>{{ t('expiringSoon') }}</h2>
            <p class="number">
              {{ expiringProducts.length }}
            </p>
          </div>

          <div class="alert-card expired">
            <h2>{{ t('expired') }}</h2>
            <p class="number">
              {{ expiredProducts.length }}
            </p>
          </div>

        </div>

        <h2>{{ t('outOfStockProducts') }}</h2>

        <table>
          <thead>
          <tr>
            <th>{{ t('product') }}</th>
            <th>{{ t('stock') }}</th>
            <th>{{ t('status') }}</th>
          </tr>
          </thead>

          <tbody>
          <tr
              v-for="product in outOfStockProducts"
              :key="product.id"
          >
            <td>{{ product.name }}</td>
            <td>{{ product.stock }}</td>
            <td>{{ t('outOfStock') }}</td>
          </tr>

          <tr v-if="outOfStockProducts.length === 0">
            <td colspan="3" class="empty">
              {{ t('noOutOfStock') }}
            </td>
          </tr>
          </tbody>
        </table>

        <h2>{{ t('lowStockProducts') }}</h2>

        <table>
          <thead>
          <tr>
            <th>{{ t('product') }}</th>
            <th>{{ t('stock') }}</th>
            <th>{{ t('status') }}</th>
          </tr>
          </thead>

          <tbody>
          <tr
              v-for="product in lowStockProducts"
              :key="product.id"
          >
            <td>{{ product.name }}</td>
            <td>{{ product.stock }}</td>
            <td>{{ t('lowStock') }}</td>
          </tr>

          <tr v-if="lowStockProducts.length === 0">
            <td colspan="3" class="empty">
              {{ t('noLowStock') }}
            </td>
          </tr>
          </tbody>
        </table>

        <h2>{{ t('expiringProducts') }}</h2>

        <table>
          <thead>
          <tr>
            <th>{{ t('product') }}</th>
            <th>{{ t('expirationDate') }}</th>
          </tr>
          </thead>

          <tbody>
          <tr
              v-for="product in expiringProducts"
              :key="product.id"
          >
            <td>{{ product.name }}</td>
            <td>{{ product.expirationDate }}</td>
          </tr>

          <tr v-if="expiringProducts.length === 0">
            <td colspan="2" class="empty">
              {{ t('noExpiring') }}
            </td>
          </tr>
          </tbody>
        </table>

        <h2>{{ t('expiredProducts') }}</h2>

        <table>
          <thead>
          <tr>
            <th>{{ t('product') }}</th>
            <th>{{ t('expirationDate') }}</th>
          </tr>
          </thead>

          <tbody>
          <tr
              v-for="product in expiredProducts"
              :key="product.id"
          >
            <td>{{ product.name }}</td>
            <td>{{ product.expirationDate }}</td>
          </tr>

          <tr v-if="expiredProducts.length === 0">
            <td colspan="2" class="empty">
              {{ t('noExpired') }}
            </td>
          </tr>
          </tbody>
        </table>

        </template>
      </div>
    </main>
  </div>
</template>

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

.alerts-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin: 25px 0;
}

.alert-card {
  padding: 20px;
  border-radius: 8px;
  color: white;
}

.alert-card h2 {
  margin: 0;
  font-size: 18px;
}

.number {
  font-size: 30px;
  font-weight: bold;
  margin: 10px 0 0;
}

.danger {
  background-color: #dc2626;
}

.warning {
  background-color: #eab308;
}

.orange {
  background-color: #f97316;
}

.expired {
  background-color: #7f1d1d;
}

table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  margin-bottom: 35px;
}

th,
td {
  padding: 12px;
  border-bottom: 1px solid #ddd;
  text-align: left;
}

th {
  background-color: #f3f4f6;
}

.empty {
  text-align: center;
  padding: 20px;
}
</style>
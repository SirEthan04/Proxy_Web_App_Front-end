<script setup>
import { useAuthStore } from '../../iam/application/auth.js'
import { PERMISSIONS } from '../../iam/domain/permissions.js'
import Button from 'primevue/button'
import { t } from '../../i18n.js'

import { computed, onMounted } from 'vue'

import Sidebar from '../../shared/presentation/components/Sidebar.vue'
import Header from '../../shared/presentation/components/Header.vue'

import { useProductsStore } from '../../inventory/application/products.js'
import { useOperationsStore } from '../../operations/application/operations.js'
import { useWasteStore } from '../../operations/application/waste.js'
import {
  getTotalProducts,
  getTotalOperations,
  getTotalWastes
} from '../application/reports.js'
const auth = useAuthStore()
const isAdministrative = computed(() => auth.can(PERMISSIONS.REPORTS_READ))
const productsStore = useProductsStore()
const operationsStore = useOperationsStore()
const wasteStore = useWasteStore()

const loading = computed(() => productsStore.loading || (isAdministrative.value && (operationsStore.loading || wasteStore.loading)))
const loadError = computed(() => productsStore.loadError || (isAdministrative.value && (operationsStore.loadError || wasteStore.loadError)))
const dataReady = computed(() => !loading.value && !loadError.value)
const loadData = async () => {
  const requests = [productsStore.loadProducts()]
  if (isAdministrative.value) requests.push(operationsStore.loadOperations(), wasteStore.loadWastes())
  await Promise.allSettled(requests)
}
onMounted(loadData)

const totalProducts = computed(() => {
  return getTotalProducts(productsStore.products)
})

const lowStockProducts = computed(() => {
  return productsStore.products.filter(
      product =>
          Number(product.stock) > 0 &&
          Number(product.stock) <= 5
  ).length
})

const outOfStockProducts = computed(() => {
  return productsStore.products.filter(
      product => Number(product.stock) <= 0
  ).length
})

const expiringProducts = computed(() => {
  const today = new Date()

  return productsStore.products.filter(product => {
    if (!product.expirationDate) {
      return false
    }

    const expirationDate = new Date(product.expirationDate)

    const difference = expirationDate - today

    const days = Math.ceil(
        difference / (1000 * 60 * 60 * 24)
    )

    return days >= 0 && days <= 7
  }).length
})

const totalOperations = computed(() => {
  return getTotalOperations(operationsStore.operations)
})

const totalWastes = computed(() => {
  return getTotalWastes(wasteStore.wastes)
})
</script>

<template>
  <div class="page">
    <Sidebar />

    <main class="main-content">
      <Header />

      <div class="content">
        <h1>{{ t('dashboardTitle') }}</h1>
        <p>{{ t(isAdministrative ? 'dashboardSubtitle' : 'employeeDashboardSubtitle') }}</p>
        <p v-if="loading" role="status">{{ t('loadingData') }}</p>
        <div v-else-if="loadError" role="alert">
          <p>{{ t(loadError) }}</p><Button @click="loadData">{{ t('retry') }}</Button>
        </div>
        <template v-if="dataReady">

        <div v-if="isAdministrative" class="cards">

          <div class="card">
            <h3>{{ t('totalProducts') }}</h3>
            <p>{{ totalProducts }}</p>
          </div>

          <div class="card warning">
            <h3>{{ t('lowStock') }}</h3>
            <p>{{ lowStockProducts }}</p>
          </div>

          <div class="card danger">
            <h3>{{ t('outOfStock') }}</h3>
            <p>{{ outOfStockProducts }}</p>
          </div>

          <div class="card orange">
            <h3>{{ t('expiringSoon') }}</h3>
            <p>{{ expiringProducts }}</p>
          </div>

          <div class="card operations">
            <h3>{{ t('operations') }}</h3>
            <p>{{ totalOperations }}</p>
          </div>

          <div class="card waste">
            <h3>{{ t('waste') }}</h3>
            <p>{{ totalWastes }}</p>
          </div>

        </div>
        <div v-else>
          <h2>{{ t('quickActions') }}</h2>
          <ul>
            <li><router-link to="/products">{{ t('consultProducts') }}</router-link></li>
            <li><router-link to="/operations">{{ t('registerMovement') }}</router-link></li>
            <li><router-link to="/waste">{{ t('registerWaste') }}</router-link></li>
            <li><router-link to="/alerts">{{ t('consultAlerts') }}</router-link></li>
          </ul>
        </div>
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

.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 25px;
}

.card {
  background-color: #2563eb;
  color: white;
  padding: 25px;
  border-radius: 8px;
}

.card h3 {
  margin: 0;
  font-size: 18px;
}

.card p {
  font-size: 32px;
  font-weight: bold;
  margin: 10px 0 0;
}

.warning {
  background-color: #eab308;
}

.danger {
  background-color: #dc2626;
}

.orange {
  background-color: #f97316;
}

.operations {
  background-color: #16a34a;
}

.waste {
  background-color: #7c3aed;
}
</style>
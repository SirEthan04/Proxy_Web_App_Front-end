<script setup>
import { useRouter } from 'vue-router'
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import StatCard from '../../shared/presentation/components/StatCard.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'
import NavIcon from '../../shared/presentation/components/NavIcon.vue'
import { translateValue } from '../../i18n.js'

import { useAuthStore } from '../../iam/application/auth.js'
import { PERMISSIONS } from '../../iam/domain/permissions.js'
import Button from 'primevue/button'
import { t } from '../../i18n.js'

import { computed, onMounted } from 'vue'


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

const router = useRouter()
const recentOperations = computed(() => operationsStore.operations.slice(-5).reverse())
const quickActions = computed(() => (isAdministrative.value ? [
  { to: '/products/new', label: 'newProduct', icon: 'plus', permission: PERMISSIONS.PRODUCTS_CREATE },
  { to: '/products', label: 'consultProducts', icon: 'box', permission: PERMISSIONS.PRODUCTS_READ },
  { to: '/operations', label: 'registerMovement', icon: 'movement', permission: PERMISSIONS.OPERATIONS_WRITE },
  { to: '/waste', label: 'registerWaste', icon: 'waste', permission: PERMISSIONS.WASTE_WRITE }
] : [
  { to: '/products', label: 'consultProducts', icon: 'box', permission: PERMISSIONS.PRODUCTS_READ },
  { to: '/operations', label: 'registerMovement', icon: 'movement', permission: PERMISSIONS.OPERATIONS_WRITE },
  { to: '/waste', label: 'registerWaste', icon: 'waste', permission: PERMISSIONS.WASTE_WRITE },
  { to: '/alerts', label: 'consultAlerts', icon: 'alert', permission: PERMISSIONS.ALERTS_READ }
]).filter(action => auth.can(action.permission)))
</script>
<template>
  <AppLayout><div class="content">
    <PageHeader :title="t(isAdministrative ? 'storeOverview' : 'dailyWorkspace')" :description="t(isAdministrative ? 'dashboardSubtitle' : 'employeeDashboardSubtitle')">
      <template v-if="auth.can(PERMISSIONS.PRODUCTS_CREATE)" #actions><Button class="new-btn" @click="router.push('/products/new')"><NavIcon name="plus" />{{ t('newProduct') }}</Button></template>
    </PageHeader>
    <RequestState :loading="loading" :error="loadError" @retry="loadData" />
    <template v-if="dataReady">
      <div v-if="isAdministrative" class="stats-grid">
        <StatCard :label="t('totalProducts')" :value="totalProducts" icon="box" tone="success" />
        <StatCard :label="t('lowStock')" :value="lowStockProducts" icon="alert" tone="warning" />
        <StatCard :label="t('expiringSoon')" :value="expiringProducts" icon="clock" tone="warning" />
        <StatCard :label="t('outOfStock')" :value="outOfStockProducts" icon="box" tone="danger" />
      </div>
      <section class="panel quick-panel">
        <div class="section-heading"><div><h2>{{ t('quickActions') }}</h2><p>{{ t('quickActionsHint') }}</p></div></div>
        <div class="quick-actions"><router-link v-for="action in quickActions" :key="action.to" :to="action.to" class="quick-action"><NavIcon :name="action.icon" /><span>{{ t(action.label) }}</span></router-link></div>
      </section>
      <div :class="{ 'dashboard-columns': isAdministrative }">
        <section v-if="isAdministrative" class="panel">
          <div class="section-heading"><div><h2>{{ t('recentMovements') }}</h2><p>{{ t('lastRegisteredMovements') }}</p></div><router-link class="section-link" to="/operations">{{ t('viewAll') }}</router-link></div>
          <p class="table-hint">{{ t('tableScrollHint') }}</p><div class="table-scroll" role="region" :aria-label="t('recentMovements')" tabindex="0">
            <table><thead><tr><th>{{ t('product') }}</th><th>{{ t('type') }}</th><th>{{ t('quantity') }}</th><th>{{ t('date') }}</th></tr></thead><tbody><tr v-for="operation in recentOperations" :key="operation.id"><td>{{ operation.productName }}</td><td><span class="status-pill">{{ translateValue(operation.type) }}</span></td><td>{{ operation.quantity }}</td><td>{{ operation.date }}</td></tr><tr v-if="recentOperations.length === 0"><td colspan="4" class="empty">{{ t('noOperations') }}</td></tr></tbody></table>
          </div>
        </section>
        <section class="panel">
          <div class="section-heading"><div><h2>{{ t('importantAlerts') }}</h2><p>{{ t('alertsNeedAttention') }}</p></div><router-link class="section-link" to="/alerts">{{ t('viewAll') }}</router-link></div>
          <div class="alert-summary"><span><NavIcon name="alert" />{{ t('lowStock') }}</span><strong class="count-badge">{{ lowStockProducts }}</strong></div>
          <div class="alert-summary"><span><NavIcon name="clock" />{{ t('expiringSoon') }}</span><strong class="count-badge">{{ expiringProducts }}</strong></div>
          <div class="alert-summary"><span><NavIcon name="box" />{{ t('outOfStock') }}</span><strong class="count-badge">{{ outOfStockProducts }}</strong></div>
        </section>
      </div>
    </template>
  </div></AppLayout>
</template>

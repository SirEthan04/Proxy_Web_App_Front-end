<script setup>
import StatCard from '../../shared/presentation/components/StatCard.vue'

import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'

import Button from 'primevue/button'
import { t } from '../../i18n.js'

import { computed, onMounted } from 'vue'

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
  <AppLayout>
    <div class="content">
      <PageHeader :title="t('alerts')" :description="t('alertsSubtitle')" />
      <RequestState :loading="loading" :error="loadError" @retry="loadData" />
      <template v-if="dataReady">
        <div class="stats-grid">
          <StatCard :label="t('outOfStock')" :value="outOfStockProducts.length" icon="box" tone="danger" />
          <StatCard :label="t('lowStock')" :value="lowStockProducts.length" icon="alert" tone="warning" />
          <StatCard :label="t('expiringSoon')" :value="expiringProducts.length" icon="clock" tone="warning" />
          <StatCard :label="t('expired')" :value="expiredProducts.length" icon="clock" tone="danger" />
        </div>
        <h2>{{ t('outOfStockProducts') }}</h2>
        <p class="table-hint">{{ t('tableScrollHint') }}</p>
        <div class="table-scroll" role="region" :aria-label="t('tableScrollHint')" tabindex="0">
          <table>
            <thead>
              <tr>
                <th>{{ t('product') }}</th>
                <th>{{ t('stock') }}</th>
                <th>{{ t('status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in outOfStockProducts" :key="product.id">
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
        </div>
        <h2>{{ t('lowStockProducts') }}</h2>
        <p class="table-hint">{{ t('tableScrollHint') }}</p>
        <div class="table-scroll" role="region" :aria-label="t('tableScrollHint')" tabindex="0">
          <table>
            <thead>
              <tr>
                <th>{{ t('product') }}</th>
                <th>{{ t('stock') }}</th>
                <th>{{ t('status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in lowStockProducts" :key="product.id">
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
        </div>
        <h2>{{ t('expiringProducts') }}</h2>
        <p class="table-hint">{{ t('tableScrollHint') }}</p>
        <div class="table-scroll" role="region" :aria-label="t('tableScrollHint')" tabindex="0">
          <table>
            <thead>
              <tr>
                <th>{{ t('product') }}</th>
                <th>{{ t('expirationDate') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in expiringProducts" :key="product.id">
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
        </div>
        <h2>{{ t('expiredProducts') }}</h2>
        <p class="table-hint">{{ t('tableScrollHint') }}</p>
        <div class="table-scroll" role="region" :aria-label="t('tableScrollHint')" tabindex="0">
          <table>
            <thead>
              <tr>
                <th>{{ t('product') }}</th>
                <th>{{ t('expirationDate') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in expiredProducts" :key="product.id">
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
        </div>
      </template>
    </div>
  </AppLayout>
</template>

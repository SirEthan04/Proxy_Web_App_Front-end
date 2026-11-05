<script setup>
import { computed, ref, onMounted } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { t, translateValue } from '../../i18n.js'
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'
import { useProductsStore } from '../../inventory/application/products.js'
import { getOutOfStockProducts, getLowStockProducts, getExpiredProducts, getExpiringProducts } from '../application/alerts.js'
const products = useProductsStore()
const selectedCategory = ref('all')
const search = ref('')
const groups = computed(() => [
  { key: 'expired', label: 'expired', tone: 'danger', products: getExpiredProducts(products.products) },
  { key: 'empty', label: 'outOfStock', tone: 'danger', products: getOutOfStockProducts(products.products) },
  { key: 'expiring', label: 'expiringSoon', tone: 'warning', products: getExpiringProducts(products.products) },
  { key: 'low', label: 'lowStock', tone: 'warning', products: getLowStockProducts(products.products) }
])
const alerts = computed(() => groups.value.flatMap(group => group.products.map(product => ({ kind: group.key, label: group.label, tone: group.tone, product }))))
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const filteredAlerts = computed(() => alerts.value.filter(alert => (selectedCategory.value === 'all' || selectedCategory.value === alert.kind) && [alert.product.id, alert.product.name, alert.product.category].some(value => normalize(value).includes(normalize(search.value)))))
const loadData = async () => { try { await products.loadProducts() } catch { /* RequestState shows errors. */ } }
onMounted(loadData)
</script>
<template>
  <AppLayout><div class="content">
    <PageHeader :title="t('alerts')" :description="t('alertsInteractiveHint')"><template #actions><Button class="cancel-btn" :disabled="products.loading" @click="loadData">{{ t('refreshData') }}</Button></template></PageHeader>
    <RequestState :loading="products.loading" :error="products.loadError" @retry="loadData" />
    <template v-if="!products.loading && !products.loadError">
      <div class="alert-filter-buttons" role="group" :aria-label="t('filterAlerts')"><Button severity="secondary" :outlined="selectedCategory !== 'all'" :aria-pressed="selectedCategory === 'all'" @click="selectedCategory = 'all'">{{ t('allAlerts') }} ({{ alerts.length }})</Button><Button v-for="group in groups" :key="group.key" :severity="group.tone" :outlined="selectedCategory !== group.key" :aria-pressed="selectedCategory === group.key" :data-alert-category="group.key" @click="selectedCategory = group.key">{{ t(group.label) }} ({{ group.products.length }})</Button></div>
      <div class="panel field"><label for="alert-search">{{ t('searchProduct') }}</label><InputText id="alert-search" v-model="search" type="search" :placeholder="t('searchByAvailableFields')" /></div>
      <p class="results-summary" aria-live="polite">{{ t('alertResultCount', { count: filteredAlerts.length }) }}</p>
      <div v-if="filteredAlerts.length" class="table-scroll" role="region" :aria-label="t('alerts')" tabindex="0"><table><thead><tr><th>{{ t('alertCategory') }}</th><th>{{ t('product') }}</th><th>{{ t('stock') }}</th><th>{{ t('expirationDate') }}</th><th>{{ t('actions') }}</th></tr></thead><tbody><tr v-for="alert in filteredAlerts" :key="alert.kind + ':' + alert.product.id"><td><span class="status-pill" :class="'status-' + alert.tone">{{ t(alert.label) }}</span></td><td>{{ alert.product.name }}<small class="cell-secondary">{{ translateValue(alert.product.category) }}</small></td><td>{{ alert.product.stock }}</td><td>{{ alert.product.expirationDate || t('notAvailable') }}</td><td><router-link class="inline-action" :to="'/products/' + alert.product.id">{{ t('viewProduct') }}</router-link></td></tr></tbody></table></div>
      <p v-else class="panel empty" role="status">{{ t(alerts.length ? 'noFilteredAlerts' : 'noAlerts') }}</p>
    </template>
  </div></AppLayout>
</template>

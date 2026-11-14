<script setup>
import './inventory.css'
import InventoryCategories from './components/InventoryCategories.vue'
import { formatSoles } from '../../shared/presentation/utils/currency.js'
import { formatQuantity, stockStatus } from '../../shared/presentation/utils/presentation.js'
import { sortProducts } from './product-order.js'

import NavIcon from '../../shared/presentation/components/NavIcon.vue'

import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'

import { useAuthStore } from '../../iam/application/auth.js'
import { PERMISSIONS } from '../../iam/domain/permissions.js'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { t, translateValue, locale } from '../../i18n.js'

import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'

import { useProductsStore } from '../application/inventory.js'

const productsStore = useProductsStore()

const pendingIds = computed(() => new Set())
const auth = useAuthStore()

const search = ref('')
const selectedCategory = ref('Todas')
const stockFilter = ref('all')
const sortBy = ref('name')
const sortDirection = ref('asc')
const categories = computed(() => [...new Set([...productsStore.categories.map(c => c.name), ...productsStore.products.map(product => product.category).filter(Boolean)])])
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const clearFilters = () => { search.value = ''; selectedCategory.value = 'Todas'; stockFilter.value = 'all'; sortBy.value = 'name'; sortDirection.value = 'asc' }

const filteredProducts = computed(() => {
  const query = normalize(search.value)
  const filtered = productsStore.products.filter(product => {
    const matchesSearch = [product.id, product.name, product.category].some(value => normalize(value).includes(query))
    const matchesCategory = selectedCategory.value === 'Todas' || product.category === selectedCategory.value
    const matchesStock = stockFilter.value === 'all' || (stockFilter.value === 'Stock bajo' ? productsStore.lowStockIds.includes(product.id) : (stockFilter.value === 'Activo' ? stockStatus(product) === 'Disponible' : product.status === stockFilter.value))
    return matchesSearch && matchesCategory && matchesStock
  })
  return sortProducts(filtered, sortBy.value, sortDirection.value, locale.value)
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
</script>
<template>
  <AppLayout><div class="content inventory-page">
    <PageHeader :title="t('products')" :description="t('productsSubtitle')"><template #actions><Button class="cancel-btn" :disabled="loading" @click="loadData">{{ t('refreshData') }}</Button><Button class="new-btn" v-if="auth.can(PERMISSIONS.PRODUCTS_CREATE)" @click="$router.push('/products/new')"><NavIcon name="plus" />{{ t('addProduct') }}</Button></template></PageHeader>
    <p class="panel">Consulta tus existencias y encuentra los productos que necesitas reponer.</p><InventoryCategories /><section class="panel inventory-filters">
      <div class="field search-field"><label for="product-search">{{ t('searchProduct') }}</label><InputText id="product-search" v-model="search" type="search" :placeholder="t('searchByAvailableFields')" /></div>
      <div class="field"><label for="product-category">{{ t('category') }}</label><select id="product-category" v-model="selectedCategory"><option value="Todas">{{ t('allCategories') }}</option><option v-for="category in categories" :key="category" :value="category">{{ translateValue(category) }}</option></select></div>
      <div class="field"><label for="stock-filter">{{ t('stockStatus') }}</label><select id="stock-filter" v-model="stockFilter"><option value="all">{{ t('allStockStatuses') }}</option><option value="Activo">Disponible</option><option value="Stock bajo">{{ t('lowStock') }}</option><option value="Sin stock">{{ t('outOfStock') }}</option></select></div>
      <div class="field"><label for="product-sort">{{ t('sortBy') }}</label><select id="product-sort" v-model="sortBy"><option value="id">{{ t('id') }}</option><option value="name">{{ t('name') }}</option><option value="category">{{ t('category') }}</option><option value="price">{{ t('price') }}</option><option value="stock">{{ t('quantity') }}</option></select></div>
      <div class="filter-actions"><Button id="sort-direction" severity="secondary" outlined @click="sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'">{{ t(sortDirection === 'asc' ? 'ascending' : 'descending') }}</Button><Button id="clear-filters" severity="secondary" text @click="clearFilters">{{ t('clearFilters') }}</Button></div>
    </section>
    <p v-if="dataReady" class="results-summary" aria-live="polite">{{ t('filteredProductCount', { count: filteredProducts.length, total: productsStore.products.length }) }} <small>{{ t('catalogRowNumberHint') }}</small></p>

    <RequestState :loading="loading" :error="loadError" @retry="loadData" />
    <div v-if="dataReady" class="table-scroll products-desktop" role="region" :aria-label="t('products')" tabindex="0"><table><thead><tr><th scope="col" :title="t('catalogRowNumberHint')">{{ t('catalogRowNumber') }}</th><th>{{ t('product') }}</th><th>{{ t('category') }}</th><th>{{ t('price') }}</th><th>{{ t('stock') }}</th><th>{{ t('status') }}</th><th>{{ t('actions') }}</th></tr></thead><tbody><tr v-for="(product, index) in filteredProducts" :key="product.id"><td class="catalog-row-number">{{ index + 1 }}</td><td><span class="name-truncate" :title="product.name">{{ product.name }}</span><small v-if="pendingIds.has(String(product.id))" class="cell-secondary field-error">{{ t('commercialProductBlocked') }}</small><small v-else-if="Number(product.stock) === 0" class="cell-secondary">{{ t('catalogEmptyStock') }}</small></td><td><span class="name-truncate" :title="product.category">{{ translateValue(product.category) }}</span></td><td>{{ formatSoles(product.price) }}</td><td class="quantity-cell">{{ formatQuantity(product.stock) }}</td><td><span :class="['status-pill', Number(product.stock) <= 0 ? 'status-danger' : product.status === 'Stock bajo' ? 'status-warning' : '']">{{ stockStatus(product) }}</span></td><td class="product-actions"><Button class="view-btn" severity="secondary" outlined @click="$router.push('/products/' + product.id)">{{ t('viewProduct') }}</Button></td></tr><tr v-if="!filteredProducts.length"><td colspan="7" class="empty">{{ t(productsStore.products.length ? 'noMatchingProducts' : 'noProducts') }}</td></tr></tbody></table></div>
    <div v-if="dataReady" class="products-mobile"><article v-for="(product, index) in filteredProducts" :key="product.id" class="panel product-mobile-card"><h2><span class="catalog-row-number">{{ t('catalogRowNumber') }} {{ index + 1 }}</span> &mdash; <span class="name-truncate" :title="product.name">{{ product.name }}</span></h2><p v-if="pendingIds.has(String(product.id))" class="field-error">{{ t('commercialProductBlocked') }}</p><p v-else-if="Number(product.stock) === 0">{{ t('catalogEmptyStock') }}</p><p><span class="name-truncate" :title="product.category">{{ translateValue(product.category) }}</span> &#183; {{ formatSoles(product.price) }}</p><p><strong>{{ t('stock') }}: {{ formatQuantity(product.stock) }}</strong> <span :class="['status-pill', Number(product.stock) <= 0 ? 'status-danger' : product.status === 'Stock bajo' ? 'status-warning' : '']">{{ stockStatus(product) }}</span></p><div class="product-actions"><Button class="view-btn" severity="secondary" outlined @click="$router.push('/products/' + product.id)">{{ t('viewProduct') }}</Button></div></article><p v-if="!filteredProducts.length" class="panel empty">{{ t(productsStore.products.length ? 'noMatchingProducts' : 'noProducts') }}</p></div>
  </div></AppLayout>
</template>

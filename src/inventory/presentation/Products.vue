<script setup>
import { getProductStatus } from '../domain/product.js'

import NavIcon from '../../shared/presentation/components/NavIcon.vue'

import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'

import { useConfirm } from 'primevue/useconfirm'
import { useAuthStore } from '../../iam/application/auth.js'
import { PERMISSIONS } from '../../iam/domain/permissions.js'
import { PRODUCT_CATEGORIES } from '../domain/product-validation.js'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { t, translateValue, locale } from '../../i18n.js'

import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'

import { useProductsStore } from '../application/products.js'

const productsStore = useProductsStore()
const auth = useAuthStore()
const confirm = useConfirm()
const confirmingDelete = ref(false)

const search = ref('')
const selectedCategory = ref('Todas')
const stockFilter = ref('all')
const sortBy = ref('name')
const sortDirection = ref('asc')
const categories = computed(() => [...new Set([...PRODUCT_CATEGORIES, ...productsStore.products.map(product => product.category).filter(Boolean)])])
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const clearFilters = () => { search.value = ''; selectedCategory.value = 'Todas'; stockFilter.value = 'all'; sortBy.value = 'name'; sortDirection.value = 'asc' }

const filteredProducts = computed(() => {
  const query = normalize(search.value)
  const filtered = productsStore.products.filter(product => {
    const matchesSearch = [product.id, product.name, product.category].some(value => normalize(value).includes(query))
    const matchesCategory = selectedCategory.value === 'Todas' || product.category === selectedCategory.value
    const matchesStock = stockFilter.value === 'all' || getProductStatus(Number(product.stock)) === stockFilter.value
    return matchesSearch && matchesCategory && matchesStock
  })
  const collator = new Intl.Collator(locale.value, { sensitivity: 'base', numeric: true })
  return filtered.sort((a, b) => {
    const key = sortBy.value
    let order
    if (key === 'price' || key === 'stock') {
      const first = Number(a[key]), second = Number(b[key])
      if (!Number.isFinite(first)) return Number.isFinite(second) ? 1 : 0
      if (!Number.isFinite(second)) return -1
      order = first - second
    } else order = collator.compare(String(a[key] ?? ''), String(b[key] ?? ''))
    return sortDirection.value === 'asc' ? order : -order
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
const confirmDeleteProduct = product => {
  if (productsStore.saving || confirmingDelete.value || !auth.can(PERMISSIONS.PRODUCTS_DELETE)) return
  const id = product.id
  confirmingDelete.value = true
  confirm.require({
    header: t('deleteProductTitle'),
    message: t('deleteProductConfirmation', { name: product.name }),
    acceptLabel: t('delete'),
    rejectLabel: t('cancel'),
    defaultFocus: 'reject',
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', outlined: true },
    accept: async () => {
      try {
        await productsStore.deleteProduct(id)
        notify('success', 'productDeleted')
      } catch (error) {
        notify('error', error.messageKey || productsStore.error || 'deleteProductFailed')
      } finally { confirmingDelete.value = false }
    },
    reject: () => { confirmingDelete.value = false },
    onHide: () => { confirmingDelete.value = false }
  })
}
</script>
<template>
  <AppLayout><div class="content">
    <PageHeader :title="t('products')" :description="t('productsSubtitle')"><template #actions><Button class="cancel-btn" :disabled="loading" @click="loadData">{{ t('refreshData') }}</Button><Button class="new-btn" v-if="auth.can(PERMISSIONS.PRODUCTS_CREATE)" @click="$router.push('/products/new')"><NavIcon name="plus" />{{ t('addProduct') }}</Button></template></PageHeader>
    <section class="panel inventory-filters">
      <div class="field search-field"><label for="product-search">{{ t('searchProduct') }}</label><InputText id="product-search" v-model="search" type="search" :placeholder="t('searchByAvailableFields')" /></div>
      <div class="field"><label for="product-category">{{ t('category') }}</label><select id="product-category" v-model="selectedCategory"><option value="Todas">{{ t('allCategories') }}</option><option v-for="category in categories" :key="category" :value="category">{{ translateValue(category) }}</option></select></div>
      <div class="field"><label for="stock-filter">{{ t('stockStatus') }}</label><select id="stock-filter" v-model="stockFilter"><option value="all">{{ t('allStockStatuses') }}</option><option value="Activo">{{ t('active') }}</option><option value="Stock bajo">{{ t('lowStock') }}</option><option value="Sin stock">{{ t('outOfStock') }}</option></select></div>
      <div class="field"><label for="product-sort">{{ t('sortBy') }}</label><select id="product-sort" v-model="sortBy"><option value="name">{{ t('name') }}</option><option value="category">{{ t('category') }}</option><option value="price">{{ t('price') }}</option><option value="stock">{{ t('quantity') }}</option></select></div>
      <div class="filter-actions"><Button id="sort-direction" severity="secondary" outlined @click="sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'">{{ t(sortDirection === 'asc' ? 'ascending' : 'descending') }}</Button><Button id="clear-filters" severity="secondary" text @click="clearFilters">{{ t('clearFilters') }}</Button></div>
    </section>
    <p v-if="dataReady" class="results-summary" aria-live="polite">{{ t('filteredProductCount', { count: filteredProducts.length, total: productsStore.products.length }) }}</p>
    <RequestState :loading="loading" :error="loadError" @retry="loadData" />
    <div v-if="dataReady" class="table-scroll products-desktop" role="region" :aria-label="t('products')" tabindex="0"><table><thead><tr><th>{{ t('id') }}</th><th>{{ t('product') }}</th><th>{{ t('category') }}</th><th>{{ t('price') }}</th><th>{{ t('stock') }}</th><th>{{ t('status') }}</th><th>{{ t('actions') }}</th></tr></thead><tbody><tr v-for="product in filteredProducts" :key="product.id"><td>{{ product.id }}</td><td>{{ product.name }}</td><td>{{ translateValue(product.category) }}</td><td>S/ {{ product.price }}</td><td>{{ product.stock }}</td><td><span class="status-pill">{{ translateValue(getProductStatus(Number(product.stock))) }}</span></td><td class="product-actions"><Button class="view-btn" severity="secondary" outlined @click="$router.push('/products/' + product.id)">{{ t('viewProduct') }}</Button><Button class="edit-btn" v-if="auth.can(PERMISSIONS.PRODUCTS_EDIT)" @click="$router.push('/products/edit/' + product.id)">{{ t('edit') }}</Button><Button class="delete-btn" v-if="auth.can(PERMISSIONS.PRODUCTS_DELETE)" @click="confirmDeleteProduct(product)" :disabled="productsStore.saving || confirmingDelete">{{ t('delete') }}</Button></td></tr><tr v-if="!filteredProducts.length"><td colspan="7" class="empty">{{ t(productsStore.products.length ? 'noMatchingProducts' : 'noProducts') }}</td></tr></tbody></table></div>
    <div v-if="dataReady" class="products-mobile"><article v-for="product in filteredProducts" :key="product.id" class="panel product-mobile-card"><h2>{{ product.name }}</h2><p>{{ translateValue(product.category) }} &#183; S/ {{ product.price }}</p><p><strong>{{ t('stock') }}: {{ product.stock }}</strong> <span class="status-pill">{{ translateValue(getProductStatus(Number(product.stock))) }}</span></p><div class="product-actions"><Button class="view-btn" severity="secondary" outlined @click="$router.push('/products/' + product.id)">{{ t('viewProduct') }}</Button><Button class="edit-btn" v-if="auth.can(PERMISSIONS.PRODUCTS_EDIT)" @click="$router.push('/products/edit/' + product.id)">{{ t('edit') }}</Button><Button class="delete-btn" v-if="auth.can(PERMISSIONS.PRODUCTS_DELETE)" @click="confirmDeleteProduct(product)" :disabled="productsStore.saving || confirmingDelete">{{ t('delete') }}</Button></div></article><p v-if="!filteredProducts.length" class="panel empty">{{ t(productsStore.products.length ? 'noMatchingProducts' : 'noProducts') }}</p></div>
  </div></AppLayout>
</template>

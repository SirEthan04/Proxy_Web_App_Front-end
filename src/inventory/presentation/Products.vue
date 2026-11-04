<script setup>
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
import { t, translateValue } from '../../i18n.js'

import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'

import { useProductsStore } from '../application/products.js'

const productsStore = useProductsStore()
const auth = useAuthStore()
const confirm = useConfirm()
const confirmingDelete = ref(false)

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
  <AppLayout>
    <div class="content">
        <PageHeader :title="t('products')" :description="t('productsSubtitle')">
  <template #actions><Button class="new-btn" v-if="auth.can(PERMISSIONS.PRODUCTS_CREATE)" @click="$router.push('/products/new')"><NavIcon name="plus" />{{ t('addProduct') }}</Button></template>
</PageHeader>

        <div class="panel filters">
  <div class="field"><label for="product-search">{{ t('searchProduct') }}</label><InputText id="product-search" v-model="search" type="search" :placeholder="t('searchProductHint')" /></div>
  <div class="field"><label for="product-category">{{ t('category') }}</label><select id="product-category" v-model="selectedCategory"><option value="Todas">{{ t('allCategories') }}</option><option v-for="category in PRODUCT_CATEGORIES" :key="category" :value="category">{{ translateValue(category) }}</option></select></div>
</div>
<p v-if="dataReady" class="results-summary" aria-live="polite">{{ t('resultsCount', { count: filteredProducts.length }) }}</p>

        <RequestState :loading="loading" :error="loadError" @retry="loadData" />
        <p class="table-hint">{{ t('tableScrollHint') }}</p>
<div class="table-scroll" role="region" :aria-label="t('tableScrollHint')" tabindex="0"><table v-if="dataReady">
          <thead>
          <tr>
            <th>{{ t('id') }}</th>
            <th>{{ t('product') }}</th>
            <th>{{ t('category') }}</th>
            <th>{{ t('price') }}</th>
            <th>{{ t('stock') }}</th>
            <th>{{ t('status') }}</th>
            <th v-if="auth.can(PERMISSIONS.PRODUCTS_EDIT) || auth.can(PERMISSIONS.PRODUCTS_DELETE)">{{ t('actions') }}</th>
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
            <td><span class="status-pill">{{ translateValue(product.status) }}</span></td>

            <td v-if="auth.can(PERMISSIONS.PRODUCTS_EDIT) || auth.can(PERMISSIONS.PRODUCTS_DELETE)">
              <Button
                  class="edit-btn" v-if="auth.can(PERMISSIONS.PRODUCTS_EDIT)"
                  @click="$router.push(`/products/edit/${product.id}`)"
              >
                {{ t('edit') }}
              </Button>

              <Button
                  class="delete-btn" v-if="auth.can(PERMISSIONS.PRODUCTS_DELETE)"
                  @click="confirmDeleteProduct(product)" :disabled="productsStore.saving || confirmingDelete"
              >
                {{ t('delete') }}
              </Button>
            </td>
          </tr>

          <tr v-if="filteredProducts.length === 0">
            <td :colspan="auth.can(PERMISSIONS.PRODUCTS_EDIT) || auth.can(PERMISSIONS.PRODUCTS_DELETE) ? 7 : 6" class="empty">
              {{ t('noProducts') }}
            </td>
          </tr>
          </tbody>
        </table></div>
    </div>
  </AppLayout>
</template>

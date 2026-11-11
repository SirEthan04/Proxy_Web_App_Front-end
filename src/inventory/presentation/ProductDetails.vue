<script setup>
import './inventory.css'
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { t, translateValue } from '../../i18n.js'
import { formatSoles } from '../../shared/presentation/utils/currency.js'
import { stockStatus, formatQuantity } from '../../shared/presentation/utils/presentation.js'
import { useProductsStore } from '../application/inventory.js'
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'
const route = useRoute()
const router = useRouter()
const products = useProductsStore()
const product = computed(() => products.products.find(item => String(item.id) === String(route.params.id)))
const loadData = async () => { try { await products.loadProducts(String(route.params.id)) } catch { /* RequestState displays the error. */ } }
watch(() => route.params.id, () => { loadData() }, { immediate: true })
</script>
<template>
  <AppLayout>
    <div class="content inventory-page">
      <PageHeader :title="t('productDetails')" :description="t('productDetailsHint')">
        <template #actions>
          <Button class="cancel-btn" @click="router.push('/products')">{{ t('backToProducts') }}</Button>
        </template>
      </PageHeader>
      <RequestState :loading="products.loading" :error="products.loadError" @retry="loadData" />
      <section v-if="product && !products.loading && !products.loadError" class="panel">
        <div class="section-heading">
          <h2>{{ product.name }}</h2>
          <Button severity="secondary" outlined @click="loadData">{{ t('refreshData') }}</Button>
        </div>
        <dl class="product-detail-grid">
          <div>
            <dt>{{ t('technicalProductId') }}</dt>
            <dd>{{ product.id }}</dd>
          </div>
          <div>
            <dt>{{ t('category') }}</dt>
            <dd>{{ translateValue(product.category) || t('notAvailable') }}</dd>
          </div>
          <div>
            <dt>{{ t('price') }}</dt>
            <dd>{{ formatSoles(product.price) }}</dd>
          </div>
          <div>
            <dt>{{ t('stock') }}</dt>
            <dd>{{ formatQuantity(product.stock) }}</dd>
          </div>
          <div>
            <dt>{{ t('status') }}</dt>
            <dd>{{ stockStatus(product) }}</dd>
          </div>
          <div>
            <dt>{{ t('expirationDate') }}</dt>
            <dd>{{ product.expirationDate || t('notAvailable') }}</dd>
          </div>
        </dl>
      </section>
      <p v-else-if="!products.loading && !products.loadError" class="panel" role="status">{{ t('productNotFound') }}</p>
    </div>
  </AppLayout>
</template>

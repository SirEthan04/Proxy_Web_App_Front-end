<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { t, translateValue } from '../../i18n.js'
import { useProductsStore } from '../application/products.js'
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'
const route = useRoute()
const router = useRouter()
const products = useProductsStore()
const product = computed(() => products.products.find(item => String(item.id) === String(route.params.id)))
const loadData = async () => { try { await products.loadProducts() } catch { /* RequestState displays the error. */ } }
watch(() => route.params.id, () => { if (!product.value || products.loadError) loadData() }, { immediate: true })
</script>
<template>
  <AppLayout>
    <div class="content">
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
            <dt>{{ t('id') }}</dt>
            <dd>{{ product.id }}</dd>
          </div>
          <div>
            <dt>{{ t('category') }}</dt>
            <dd>{{ translateValue(product.category) || t('notAvailable') }}</dd>
          </div>
          <div>
            <dt>{{ t('price') }}</dt>
            <dd>{{ product.price === null || product.price === undefined ? t('notAvailable') : 'S/ ' + product.price }}</dd>
          </div>
          <div>
            <dt>{{ t('stock') }}</dt>
            <dd>{{ product.stock ?? t('notAvailable') }}</dd>
          </div>
          <div>
            <dt>{{ t('status') }}</dt>
            <dd>{{ translateValue(product.status) || t('notAvailable') }}</dd>
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

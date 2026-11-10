<script setup>
import './inventory.css'
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'

import { t, translateValue } from '../../i18n.js'
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import { useRouter } from 'vue-router'
import { useProductsStore } from '../application/inventory.js'

const router = useRouter()
const productsStore = useProductsStore()
onMounted(() => productsStore.loadProducts().catch(() => {}))
const toast = useToast()
const notify = (severity, key) => toast.add({
  severity,
  summary: t(severity === 'success' ? 'successTitle' : 'errorTitle'),
  detail: t(key),
  life: severity === 'success' ? 4000 : 8000
})
const name = ref('')
const category = ref('')
const price = ref('')
const stock = ref('0')
const minimumStock = ref('0')
const busy = computed(() => productsStore.saving)

const saveProduct = async () => {
  if (busy.value) return
  const product = { name: name.value, categoryId: category.value, price: price.value, minimumStock: minimumStock.value }
  try {
    await productsStore.addProduct(product)
    notify('success', 'productCreated')
    await router.push('/products')
  } catch (error) { notify('error', error.message) }
}
</script>

<template>
  <AppLayout>
    <div class="content inventory-page">
      <PageHeader :title="t('newProduct')" :description="t('newProductSubtitle')" />
      <RequestState :loading="productsStore.loading" :error="productsStore.loadError" @retry="productsStore.loadProducts().catch(() => {})" /><p>El stock inicial es cero. El vencimiento se registra por lote en operaciones de inventario.</p><form class="panel form-grid" @submit.prevent="saveProduct" novalidate>
        <div class="form-intro">
          <h2>{{ t('productInformation') }}</h2>
          <p>{{ t('productFormHint') }}</p>
        </div>
        <div class="span-2">
          <div class="field">
            <label for="product-name">{{ t('name') }}</label>
            <InputText
              id="product-name"
              v-model="name"
              :disabled="busy"
              type="text"
              autocomplete="off"
              aria-required="true"
            />
          </div>
        </div>
        <div class="field">
          <label for="product-category">{{ t('category') }}</label>
          <select id="product-category" v-model="category" :disabled="busy" :title="productsStore.categories.find(c => c.id === category)?.name" aria-required="true">
            <option value="">{{ t('selectCategory') }}</option>
            <option v-for="item in productsStore.categories.filter(c => c.active)" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </div>
        <div class="field">
          <label for="product-price">{{ t('price') }}</label>
          <InputText
            id="product-price"
            v-model="price"
            :disabled="busy"
            type="number"
            min="0"
            step="any"
            inputmode="decimal"
            aria-required="true"
          />
        </div>
        <div class="field">
          <label for="product-stock">{{ t('stock') }}</label>
          <InputText
            id="product-stock"
            :value="stock" readonly
            :disabled="busy"
            type="number"
            inputmode="decimal"
            step="any"
            aria-required="true"
          />
        </div>
        <div class="field">
          <label for="product-expiry">Stock mínimo</label>
          <InputText id="product-expiry" v-model="minimumStock" :disabled="busy" type="number" min="0" step="1" aria-required="true" />
        </div>
        <div class="form-actions">
          <Button type="button" class="cancel-btn" :disabled="busy" @click="router.push('/products')">{{ t('cancel') }}</Button>
          <Button type="submit" class="save-btn" :disabled="busy" :loading="busy">{{ t('saveProduct') }}</Button>
        </div>
      </form>
    </div>
  </AppLayout>
</template>

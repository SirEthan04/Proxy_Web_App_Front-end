<script setup>
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { t, translateValue } from '../../i18n.js'
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'
import ProductPicker from '../../inventory/presentation/components/ProductPicker.vue'
import StockPreview from './components/StockPreview.vue'
import { useProductsStore } from '../../inventory/application/products.js'
import { useWasteStore } from '../application/waste.js'
import { WASTE_REASONS } from '../domain/waste.js'
import { previewWaste } from '../domain/stock-change.js'

const productsStore = useProductsStore()
const wasteStore = useWasteStore()
const toast = useToast()
const confirm = useConfirm()
const selectedProductId = ref('')
const quantity = ref('')
const reason = ref('')
const quantityTouched = ref(false)
const confirmationOpen = ref(false)
const reviewLoaded = ref(false)
const selectedProduct = computed(() => productsStore.products.find(product => String(product.id) === String(selectedProductId.value)))
const preview = computed(() => selectedProduct.value ? previewWaste(selectedProduct.value.stock, quantity.value, reason.value) : { valid: false, errorKey: 'selectProductFirst', stockBefore: null, stockAfter: null })
const quantityError = computed(() => quantityTouched.value && ['positiveQuantity', 'insufficientStock', 'wasteExceedsStock', 'invalidProductStock'].includes(preview.value.errorKey) ? preview.value.errorKey : null)
const busy = computed(() => wasteStore.submitting || wasteStore.saving || productsStore.saving)
const loading = computed(() => productsStore.loading || wasteStore.loading)
const loadError = computed(() => productsStore.loadError || wasteStore.loadError)
const dataReady = computed(() => !loading.value && !loadError.value)
const formDisabled = computed(() => busy.value || confirmationOpen.value || !dataReady.value || wasteStore.needsReview)
const recentRecords = computed(() => wasteStore.wastes.slice(-10).reverse())

const notify = (severity, key) => toast.add({ severity, summary: t(severity === 'success' ? 'successTitle' : 'errorTitle'), detail: t(key), life: severity === 'success' ? 4000 : 8000 })
const loadData = async () => {
  if (busy.value || confirmationOpen.value) return false
  const results = await Promise.allSettled([productsStore.loadProducts(), wasteStore.loadWastes()])
  return results.every(result => result.status === 'fulfilled')
}
onMounted(loadData)
const reloadForReview = async () => { reviewLoaded.value = false; const refreshed = await loadData(); reviewLoaded.value = Boolean(refreshed && dataReady.value) }
const execute = async snapshot => {
  if (busy.value) return
  try {
    await wasteStore.registerWaste(snapshot)
    selectedProductId.value = ''
    quantity.value = ''
    reason.value = ''
    quantityTouched.value = false
    notify('success', 'wasteSaved')
  } catch (error) {
    reviewLoaded.value = false
    notify('error', error.messageKey || wasteStore.error || 'wasteFailed')
  }
}
const requestConfirmation = () => {
  quantityTouched.value = true
  if (formDisabled.value || !preview.value.valid) return
  const snapshot = { productId: selectedProduct.value.id, quantity: preview.value.quantity, reason: reason.value, expectedStock: preview.value.stockBefore }
  confirmationOpen.value = true
  confirm.require({
    header: t('confirmWaste'),
    message: t('confirmStockChange', { product: selectedProduct.value.name, operation: translateValue(reason.value), quantity: snapshot.quantity, before: preview.value.stockBefore, after: preview.value.stockAfter }),
    acceptLabel: t('confirmRegistration'), rejectLabel: t('cancel'), defaultFocus: 'reject',
    acceptProps: { severity: 'success' }, rejectProps: { severity: 'secondary', outlined: true },
    accept: () => { confirmationOpen.value = false; return execute(snapshot) },
    reject: () => { confirmationOpen.value = false }, onHide: () => { confirmationOpen.value = false }
  })
}
</script>
<template>
  <AppLayout>
    <div class="content">
      <PageHeader :title="t('waste')" :description="t('wasteSubtitle')">
        <template #actions>
          <Button class="cancel-btn" :disabled="busy || loading || confirmationOpen" @click="loadData">{{ t('refreshData') }}</Button>
        </template>
      </PageHeader>
      <RequestState :loading="loading" :error="loadError" @retry="loadData" />
      <div v-if="wasteStore.needsReview" class="review-warning" role="alert">
        <p>{{ t('partialWriteWarning') }}</p>
        <Button @click="reloadForReview" :disabled="loading || busy">{{ t('reloadData') }}</Button>
        <Button v-if="dataReady && reviewLoaded" @click="wasteStore.needsReview = false">{{ t('reviewCompleted') }}</Button>
      </div>
      <form class="panel form-grid form" @submit.prevent="requestConfirmation" novalidate>
        <div class="form-intro">
          <h2>{{ t('registerWaste') }}</h2>
          <p>{{ t('movementFormHint') }}</p>
        </div>
        <div class="field span-2">
          <label for="waste-product">{{ t('product') }}</label>
          <ProductPicker
            input-id="waste-product"
            v-model="selectedProductId"
            :products="productsStore.products"
            :disabled="formDisabled"
          />
          <small v-if="selectedProduct">{{ t('availableStock', { stock: selectedProduct.stock }) }}</small>
        </div>
        <div class="field">
          <label for="waste-reason">{{ t('reason') }}</label>
          <select id="waste-reason" v-model="reason" :disabled="formDisabled">
            <option value="">{{ t('selectReason') }}</option>
            <option v-for="item in WASTE_REASONS" :key="item" :value="item">{{ translateValue(item) }}</option>
          </select>
        </div>
        <div class="field">
          <label for="waste-quantity">{{ t('quantity') }}</label>
          <InputText
            id="waste-quantity"
            v-model="quantity"
            type="number"
            step="any"
            inputmode="decimal"
            :disabled="formDisabled"
            :aria-invalid="Boolean(quantityError)"
            :aria-describedby="quantityError ? 'waste-quantity-error' : undefined"
            @update:model-value="quantityTouched = true"
          />
          <small v-if="quantityError" id="waste-quantity-error" class="field-error" role="alert">{{ t(quantityError) }}</small>
        </div>
        <StockPreview :preview="preview" :selected="Boolean(selectedProduct)" />
        <div class="form-actions">
          <Button type="submit" class="save-btn" :disabled="formDisabled || !preview.valid" :loading="busy">{{ t('reviewWaste') }}</Button>
        </div>
      </form>
      <div class="section-heading">
        <div>
          <h2>{{ t('wasteHistory') }}</h2>
          <p>{{ t('recentReceivedHint') }}</p>
        </div>
      </div>
      <div v-if="dataReady" class="table-scroll" role="region" :aria-label="t('wasteHistory')" tabindex="0">
        <table>
          <thead>
            <tr>
              <th>{{ t('id') }}</th>
              <th>{{ t('product') }}</th>
              <th>{{ t('reason') }}</th>
              <th>{{ t('quantity') }}</th>
              <th>{{ t('date') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in recentRecords" :key="record.id">
              <td>{{ record.id }}</td>
              <td>
                <router-link :to="'/products/' + record.productId">{{ record.productName }}</router-link>
              </td>
              <td>{{ translateValue(record.reason) }}</td>
              <td>{{ record.quantity }}</td>
              <td>{{ record.date }}</td>
            </tr>
            <tr v-if="!recentRecords.length">
              <td colspan="5" class="empty">{{ t('noWaste') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { formatDate } from '../../shared/presentation/utils/date-format.js'
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import SelectButton from 'primevue/selectbutton'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { t, translateValue } from '../../i18n.js'
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'
import ProductPicker from '../../inventory/presentation/components/ProductPicker.vue'
import StockPreview from './components/StockPreview.vue'
import { useProductsStore } from '../../inventory/application/products.js'
import { useOperationsStore } from '../application/operations.js'
import { OPERATION_TYPES } from '../domain/operation.js'
import { previewOperation } from '../domain/stock-change.js'

const productsStore = useProductsStore()
const operationsStore = useOperationsStore()
const toast = useToast()
const confirm = useConfirm()
const selectedProductId = ref('')
const quantity = ref('')
const type = ref('')
const quantityTouched = ref(false)
const confirmationOpen = ref(false)
const reviewLoaded = ref(false)
const selectedProduct = computed(() => productsStore.products.find(product => String(product.id) === String(selectedProductId.value)))
const preview = computed(() => selectedProduct.value ? previewOperation(selectedProduct.value.stock, quantity.value, type.value) : { valid: false, errorKey: 'selectProductFirst', stockBefore: null, stockAfter: null })
const quantityError = computed(() => quantityTouched.value && ['positiveQuantity', 'insufficientStock', 'wasteExceedsStock', 'invalidProductStock'].includes(preview.value.errorKey) ? preview.value.errorKey : null)
const busy = computed(() => operationsStore.submitting || operationsStore.saving || productsStore.saving)
const loading = computed(() => productsStore.loading || operationsStore.loading)
const loadError = computed(() => productsStore.loadError || operationsStore.loadError)
const dataReady = computed(() => !loading.value && !loadError.value)
const formDisabled = computed(() => busy.value || confirmationOpen.value || !dataReady.value || operationsStore.needsReview)
const recentRecords = computed(() => operationsStore.operations.slice(-10).reverse())
const operationOptions = computed(() => Object.values(OPERATION_TYPES).map(value => ({ value, label: translateValue(value) })))
const notify = (severity, key) => toast.add({ severity, summary: t(severity === 'success' ? 'successTitle' : 'errorTitle'), detail: t(key), life: severity === 'success' ? 4000 : 8000 })
const loadData = async () => {
  if (busy.value || confirmationOpen.value) return false
  const results = await Promise.allSettled([productsStore.loadProducts(), operationsStore.loadOperations()])
  return results.every(result => result.status === 'fulfilled')
}
onMounted(loadData)
const reloadForReview = async () => { reviewLoaded.value = false; const refreshed = await loadData(); reviewLoaded.value = Boolean(refreshed && dataReady.value) }
const execute = async snapshot => {
  if (busy.value) return
  try {
    await operationsStore.registerOperation(snapshot)
    selectedProductId.value = ''
    quantity.value = ''
    type.value = ''
    quantityTouched.value = false
    notify('success', 'operationSaved')
  } catch (error) {
    reviewLoaded.value = false
    notify('error', error.messageKey || operationsStore.error || 'operationFailed')
  }
}
const requestConfirmation = () => {
  quantityTouched.value = true
  if (formDisabled.value || !preview.value.valid) return
  const snapshot = { productId: selectedProduct.value.id, quantity: preview.value.quantity, type: type.value, expectedStock: preview.value.stockBefore }
  confirmationOpen.value = true
  confirm.require({
    header: t('confirmMovement'),
    message: t('confirmStockChange', { product: selectedProduct.value.name, operation: translateValue(type.value), quantity: snapshot.quantity, before: preview.value.stockBefore, after: preview.value.stockAfter }),
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
      <PageHeader :title="t('operations')" :description="t('operationsSubtitle')">
        <template #actions>
          <Button class="cancel-btn" :disabled="busy || loading || confirmationOpen" @click="loadData">{{ t('refreshData') }}</Button>
        </template>
      </PageHeader>
      <RequestState :loading="loading" :error="loadError" @retry="loadData" />
      <div v-if="operationsStore.needsReview" class="review-warning" role="alert">
        <p>{{ t('partialWriteWarning') }}</p>
        <Button @click="reloadForReview" :disabled="loading || busy">{{ t('reloadData') }}</Button>
        <Button v-if="dataReady && reviewLoaded" @click="operationsStore.needsReview = false">{{ t('reviewCompleted') }}</Button>
      </div>
      <form class="panel form-grid form" @submit.prevent="requestConfirmation" novalidate>
        <div class="form-intro">
          <h2>{{ t('registerMovement') }}</h2>
          <p>{{ t('movementFormHint') }}</p>
        </div>
        <div class="field span-2">
          <label for="movement-product">{{ t('product') }}</label>
          <ProductPicker
            input-id="movement-product"
            v-model="selectedProductId"
            :products="productsStore.products"
            :disabled="formDisabled"
          />
          <small v-if="selectedProduct">{{ t('availableStock', { stock: selectedProduct.stock }) }}</small>
        </div>
        <div class="field movement-type">
          <label id="movement-type-label">{{ t('operationType') }}</label>
          <SelectButton
            v-model="type"
            :options="operationOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            :disabled="formDisabled"
            aria-labelledby="movement-type-label"
          />
        </div>
        <div class="field">
          <label for="movement-quantity">{{ t('quantity') }}</label>
          <InputText
            id="movement-quantity"
            v-model="quantity"
            type="number"
            step="any"
            inputmode="decimal"
            :disabled="formDisabled"
            :aria-invalid="Boolean(quantityError)"
            :aria-describedby="quantityError ? 'movement-quantity-error' : undefined"
            @update:model-value="quantityTouched = true"
          />
          <small v-if="quantityError" id="movement-quantity-error" class="field-error" role="alert">{{ t(quantityError) }}</small>
        </div>
        <StockPreview :preview="preview" :selected="Boolean(selectedProduct)" />
        <div class="form-actions">
          <Button type="submit" class="save-btn" :disabled="formDisabled || !preview.valid" :loading="busy">{{ t('reviewMovement') }}</Button>
        </div>
      </form>
      <div class="section-heading">
        <div>
          <h2>{{ t('operationHistory') }}</h2>
          <p>{{ t('recentReceivedHint') }}</p>
        </div>
      </div>
      <div v-if="dataReady" class="table-scroll" role="region" :aria-label="t('operationHistory')" tabindex="0">
        <table>
          <thead>
            <tr>
              <th>{{ t('id') }}</th>
              <th>{{ t('product') }}</th>
              <th>{{ t('type') }}</th>
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
              <td>{{ translateValue(record.type) }}</td>
              <td>{{ record.quantity }}</td>
              <td>{{ record.sourceId && /^\d{4}-\d{2}-\d{2}T/.test(record.date) ? formatDate(record.date) : record.date }}<router-link v-if="record.sourceId && ['purchase', 'sale'].includes(record.sourceType)" class="cell-secondary inline-action" :to="(record.sourceType === 'purchase' ? '/purchases/' : '/sales/') + record.sourceId">{{ t('commercialViewDocument') }}</router-link></td>
            </tr>
            <tr v-if="!recentRecords.length">
              <td colspan="5" class="empty">{{ t('noOperations') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AppLayout>
</template>

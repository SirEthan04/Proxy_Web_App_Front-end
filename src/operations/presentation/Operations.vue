<script setup>
import InputText from 'primevue/inputtext'

import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'

import { t, translateValue } from '../../i18n.js'
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useProductsStore } from '../../inventory/application/products.js'
import { useOperationsStore } from '../application/operations.js'
import { OPERATION_TYPES } from '../domain/operation.js'

const productsStore = useProductsStore()
const operationsStore = useOperationsStore()
const toast = useToast()
const notify = (severity, key) => toast.add({
  severity,
  summary: t(severity === 'success' ? 'successTitle' : 'errorTitle'),
  detail: t(key),
  life: severity === 'success' ? 4000 : 8000
})
const selectedProductId = ref('')
const quantity = ref('')
const operationType = ref('')
const busy = computed(() => operationsStore.submitting || operationsStore.saving || productsStore.saving)
const loading = computed(() => productsStore.loading || operationsStore.loading)
const loadError = computed(() => productsStore.loadError || operationsStore.loadError)
const dataReady = computed(() => !loading.value && !loadError.value)
const loadData = async () => {
  await Promise.allSettled([productsStore.loadProducts(), operationsStore.loadOperations()])
}
onMounted(loadData)
const reviewLoaded = ref(false)
const reloadForReview = async () => {
  reviewLoaded.value = false
  await loadData()
  reviewLoaded.value = dataReady.value
}
const saveOperation = async () => {
  if (busy.value || !dataReady.value || operationsStore.needsReview) return
  if (!selectedProductId.value || quantity.value === '' || !operationType.value) { notify('error', 'requiredFields'); return }
  try {
    await operationsStore.registerOperation({ productId: selectedProductId.value, quantity: quantity.value, type: operationType.value })
    selectedProductId.value = ''
    quantity.value = ''
    operationType.value = ''
    notify('success', 'operationSaved')
  } catch (error) {
    reviewLoaded.value = false
    notify('error', error.messageKey || operationsStore.error || 'operationFailed')
  }
}
</script>

<template>
  <AppLayout>
    <div class="content">
        <PageHeader :title="t('operations')" :description="t('operationsSubtitle')" />

        <RequestState :loading="loading" :error="loadError" @retry="loadData" />
        <div v-if="operationsStore.needsReview" class="review-warning" role="alert">
          <p>{{ t('partialWriteWarning') }}</p>
          <Button @click="reloadForReview" :disabled="loading">{{ t('reloadData') }}</Button>
          <Button v-if="dataReady && reviewLoaded" @click="operationsStore.needsReview = false">{{ t('reviewCompleted') }}</Button>
        </div>
        <form class="panel form-grid form" @submit.prevent="saveOperation" novalidate><div class="form-intro"><h2>{{ t('registerMovement') }}</h2><p>{{ t('movementFormHint') }}</p></div>
          <div class="field"><label for="movement-1">{{ t('product') }}</label><select id="movement-1" :disabled="busy || !dataReady || operationsStore.needsReview" v-model="selectedProductId">
            <option value="">{{ t('selectProduct') }}</option>

            <option
                v-for="product in productsStore.products"
                :key="product.id"
                :value="product.id"
            >
              {{ product.name }} - {{ t('stock') }}: {{ product.stock }}
            </option>
          </select></div>

          <div class="field"><label for="movement-2">{{ t('operationType') }}</label><select id="movement-2" :disabled="busy || !dataReady || operationsStore.needsReview" v-model="operationType">
            <option value="">{{ t('selectOperation') }}</option>

            <option :value="OPERATION_TYPES.ENTRY">
              {{ translateValue(OPERATION_TYPES.ENTRY) }}
            </option>

            <option :value="OPERATION_TYPES.EXIT">
              {{ translateValue(OPERATION_TYPES.EXIT) }}
            </option>
          </select></div>

          <div class="field"><label for="movement-3">{{ t('quantity') }}</label><InputText id="movement-3" :disabled="busy || !dataReady || operationsStore.needsReview"
              v-model="quantity"
              type="number"
              :placeholder="t('quantity')"
           /></div>

          <div class="form-actions"><Button
              class="save-btn" :disabled="busy || !dataReady || operationsStore.needsReview" :loading="busy"
              type="submit"
          >
            {{ t('registerOperation') }}
          </Button></div>
        </form>

        <h2>{{ t('operationHistory') }}</h2>

        <p class="table-hint">{{ t('tableScrollHint') }}</p>
<div class="table-scroll" role="region" :aria-label="t('tableScrollHint')" tabindex="0"><table v-if="dataReady">
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
          <tr
              v-for="operation in operationsStore.operations"
              :key="operation.id"
          >
            <td>{{ operation.id }}</td>
            <td>{{ operation.productName }}</td>
            <td>{{ translateValue(operation.type) }}</td>
            <td>{{ operation.quantity }}</td>
            <td>{{ operation.date }}</td>
          </tr>

          <tr v-if="operationsStore.operations.length === 0">
            <td colspan="5" class="empty">
              {{ t('noOperations') }}
            </td>
          </tr>
          </tbody>
        </table></div>
    </div>
  </AppLayout>
</template>

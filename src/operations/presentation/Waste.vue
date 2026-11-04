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
import { useWasteStore } from '../application/waste.js'
import { WASTE_REASONS } from '../domain/waste.js'

const productsStore = useProductsStore()
const wasteStore = useWasteStore()
const toast = useToast()
const notify = (severity, key) => toast.add({
  severity,
  summary: t(severity === 'success' ? 'successTitle' : 'errorTitle'),
  detail: t(key),
  life: severity === 'success' ? 4000 : 8000
})
const selectedProductId = ref('')
const quantity = ref('')
const reason = ref('')
const busy = computed(() => wasteStore.submitting || wasteStore.saving || productsStore.saving)
const loading = computed(() => productsStore.loading || wasteStore.loading)
const loadError = computed(() => productsStore.loadError || wasteStore.loadError)
const dataReady = computed(() => !loading.value && !loadError.value)
const loadData = async () => {
  await Promise.allSettled([productsStore.loadProducts(), wasteStore.loadWastes()])
}
onMounted(loadData)
const reviewLoaded = ref(false)
const reloadForReview = async () => {
  reviewLoaded.value = false
  await loadData()
  reviewLoaded.value = dataReady.value
}
const saveWaste = async () => {
  if (busy.value || !dataReady.value || wasteStore.needsReview) return
  if (!selectedProductId.value || quantity.value === '' || !reason.value) { notify('error', 'requiredFields'); return }
  try {
    await wasteStore.registerWaste({ productId: selectedProductId.value, quantity: quantity.value, reason: reason.value })
    selectedProductId.value = ''
    quantity.value = ''
    reason.value = ''
    notify('success', 'wasteSaved')
  } catch (error) {
    reviewLoaded.value = false
    notify('error', error.messageKey || wasteStore.error || 'wasteFailed')
  }
}
</script>

<template>
  <AppLayout>
    <div class="content">
        <PageHeader :title="t('waste')" :description="t('wasteSubtitle')" />

        <RequestState :loading="loading" :error="loadError" @retry="loadData" />
        <div v-if="wasteStore.needsReview" class="review-warning" role="alert">
          <p>{{ t('partialWriteWarning') }}</p>
          <Button @click="reloadForReview" :disabled="loading">{{ t('reloadData') }}</Button>
          <Button v-if="dataReady && reviewLoaded" @click="wasteStore.needsReview = false">{{ t('reviewCompleted') }}</Button>
        </div>
        <form class="panel form-grid form" @submit.prevent="saveWaste" novalidate><div class="form-intro"><h2>{{ t('registerWaste') }}</h2><p>{{ t('movementFormHint') }}</p></div>
          <div class="field"><label for="waste-1">{{ t('product') }}</label><select id="waste-1" :disabled="busy || !dataReady || wasteStore.needsReview" v-model="selectedProductId">
            <option value="">{{ t('selectProduct') }}</option>

            <option
                v-for="product in productsStore.products"
                :key="product.id"
                :value="product.id"
            >
              {{ product.name }} - {{ t('stock') }}: {{ product.stock }}
            </option>
          </select></div>

          <div class="field"><label for="waste-2">{{ t('quantity') }}</label><InputText id="waste-2" :disabled="busy || !dataReady || wasteStore.needsReview"
              v-model="quantity"
              type="number"
              :placeholder="t('quantity')"
           /></div>

          <div class="field"><label for="waste-3">{{ t('reason') }}</label><select id="waste-3" :disabled="busy || !dataReady || wasteStore.needsReview" v-model="reason">
            <option value="">{{ t('selectReason') }}</option>

            <option
                v-for="wasteReason in WASTE_REASONS"
                :key="wasteReason"
                :value="wasteReason"
            >
              {{ translateValue(wasteReason) }}
            </option>
          </select></div>

          <div class="form-actions"><Button
              class="save-btn" :disabled="busy || !dataReady || wasteStore.needsReview" :loading="busy"
              type="submit"
          >
            {{ t('registerWaste') }}
          </Button></div>
        </form>

        <h2>{{ t('wasteHistory') }}</h2>

        <p class="table-hint">{{ t('tableScrollHint') }}</p>
<div class="table-scroll" role="region" :aria-label="t('tableScrollHint')" tabindex="0"><table v-if="dataReady">
          <thead>
          <tr>
            <th>{{ t('id') }}</th>
            <th>{{ t('product') }}</th>
            <th>{{ t('quantity') }}</th>
            <th>{{ t('reason') }}</th>
            <th>{{ t('date') }}</th>
          </tr>
          </thead>

          <tbody>
          <tr
              v-for="waste in wasteStore.wastes"
              :key="waste.id"
          >
            <td>{{ waste.id }}</td>
            <td>{{ waste.productName }}</td>
            <td>{{ waste.quantity }}</td>
            <td>{{ translateValue(waste.reason) }}</td>
            <td>{{ waste.date }}</td>
          </tr>

          <tr v-if="wasteStore.wastes.length === 0">
            <td colspan="5" class="empty">
              {{ t('noWaste') }}
            </td>
          </tr>
          </tbody>
        </table></div>
    </div>
  </AppLayout>
</template>

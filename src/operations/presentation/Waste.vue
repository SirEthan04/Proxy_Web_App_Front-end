<script setup>
import { t, translateValue } from '../../i18n.js'
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import Sidebar from '../../shared/presentation/components/Sidebar.vue'
import Header from '../../shared/presentation/components/Header.vue'
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
  <div class="page">
    <Sidebar />

    <main class="main-content">
      <Header />

      <div class="content">
        <h1>{{ t('waste') }}</h1>
        <p>{{ t('wasteSubtitle') }}</p>

        <p v-if="loading" role="status">{{ t('loadingData') }}</p>
        <div v-else-if="loadError" role="alert">
          <p>{{ t(loadError) }}</p><Button @click="loadData">{{ t('retry') }}</Button>
        </div>
        <div v-if="wasteStore.needsReview" role="alert">
          <p>{{ t('partialWriteWarning') }}</p>
          <Button @click="reloadForReview" :disabled="loading">{{ t('reloadData') }}</Button>
          <Button v-if="dataReady && reviewLoaded" @click="wasteStore.needsReview = false">{{ t('reviewCompleted') }}</Button>
        </div>
        <div class="form">
          <label>{{ t('product') }}</label>

          <select :disabled="busy || !dataReady || wasteStore.needsReview" v-model="selectedProductId">
            <option value="">{{ t('selectProduct') }}</option>

            <option
                v-for="product in productsStore.products"
                :key="product.id"
                :value="product.id"
            >
              {{ product.name }} - {{ t('stock') }}: {{ product.stock }}
            </option>
          </select>

          <label>{{ t('quantity') }}</label>

          <input :disabled="busy || !dataReady || wasteStore.needsReview"
              v-model="quantity"
              type="number"
              :placeholder="t('quantity')"
          >

          <label>{{ t('reason') }}</label>

          <select :disabled="busy || !dataReady || wasteStore.needsReview" v-model="reason">
            <option value="">{{ t('selectReason') }}</option>

            <option
                v-for="wasteReason in WASTE_REASONS"
                :key="wasteReason"
                :value="wasteReason"
            >
              {{ translateValue(wasteReason) }}
            </option>
          </select>

          <Button
              class="save-btn" :disabled="busy || !dataReady || wasteStore.needsReview" :loading="busy"
              @click="saveWaste"
          >
            {{ t('registerWaste') }}
          </Button>
        </div>

        <h2>{{ t('wasteHistory') }}</h2>

        <table v-if="dataReady">
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
        </table>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page {
  display: flex;
}

.main-content {
  flex: 1;
}

.content {
  padding: 30px;
}

.form {
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 40px;
}

input,
select {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.save-btn {
  margin-top: 10px;
  background-color: #dc2626;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 6px;
  cursor: pointer;
}

.save-btn:hover {
  background-color: #b91c1c;
}

table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
}

th,
td {
  padding: 12px;
  border-bottom: 1px solid #ddd;
  text-align: left;
}

.empty {
  text-align: center;
  padding: 25px;
}
</style>
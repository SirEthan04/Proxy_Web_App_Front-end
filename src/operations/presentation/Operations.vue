<script setup>
import { t, translateValue } from '../../i18n.js'
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import Sidebar from '../../shared/presentation/components/Sidebar.vue'
import Header from '../../shared/presentation/components/Header.vue'
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
  <div class="page">
    <Sidebar />

    <main class="main-content">
      <Header />

      <div class="content">
        <h1>{{ t('operations') }}</h1>
        <p>{{ t('operationsSubtitle') }}</p>

        <p v-if="loading" role="status">{{ t('loadingData') }}</p>
        <div v-else-if="loadError" role="alert">
          <p>{{ t(loadError) }}</p><Button @click="loadData">{{ t('retry') }}</Button>
        </div>
        <div v-if="operationsStore.needsReview" role="alert">
          <p>{{ t('partialWriteWarning') }}</p>
          <Button @click="reloadForReview" :disabled="loading">{{ t('reloadData') }}</Button>
          <Button v-if="dataReady && reviewLoaded" @click="operationsStore.needsReview = false">{{ t('reviewCompleted') }}</Button>
        </div>
        <div class="form">
          <label>{{ t('product') }}</label>

          <select :disabled="busy || !dataReady || operationsStore.needsReview" v-model="selectedProductId">
            <option value="">{{ t('selectProduct') }}</option>

            <option
                v-for="product in productsStore.products"
                :key="product.id"
                :value="product.id"
            >
              {{ product.name }} - {{ t('stock') }}: {{ product.stock }}
            </option>
          </select>

          <label>{{ t('operationType') }}</label>

          <select :disabled="busy || !dataReady || operationsStore.needsReview" v-model="operationType">
            <option value="">{{ t('selectOperation') }}</option>

            <option :value="OPERATION_TYPES.ENTRY">
              {{ translateValue(OPERATION_TYPES.ENTRY) }}
            </option>

            <option :value="OPERATION_TYPES.EXIT">
              {{ translateValue(OPERATION_TYPES.EXIT) }}
            </option>
          </select>

          <label>{{ t('quantity') }}</label>

          <input :disabled="busy || !dataReady || operationsStore.needsReview"
              v-model="quantity"
              type="number"
              :placeholder="t('quantity')"
          >

          <Button
              class="save-btn" :disabled="busy || !dataReady || operationsStore.needsReview" :loading="busy"
              @click="saveOperation"
          >
            {{ t('registerOperation') }}
          </Button>
        </div>

        <h2>{{ t('operationHistory') }}</h2>

        <table v-if="dataReady">
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
  background-color: #16a34a;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 6px;
  cursor: pointer;
}

.save-btn:hover {
  background-color: #15803d;
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
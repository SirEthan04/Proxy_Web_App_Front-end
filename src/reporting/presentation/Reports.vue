<script setup>
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'

import Button from 'primevue/button'
import { t, translateValue } from '../../i18n.js'

import { computed, onMounted, ref } from 'vue'

import {
  getEntries,
  getExits
} from '../application/reports.js'
import { useProductsStore } from '../../inventory/application/products.js'
import { useOperationsStore } from '../../operations/application/operations.js'
import { useWasteStore } from '../../operations/application/waste.js'

const productsStore = useProductsStore()
const operationsStore = useOperationsStore()
const wasteStore = useWasteStore()

const selectedReport = ref('Inventario')

const loading = computed(() => productsStore.loading || operationsStore.loading || wasteStore.loading)
const loadError = computed(() => productsStore.loadError || operationsStore.loadError || wasteStore.loadError)
const dataReady = computed(() => !loading.value && !loadError.value)
const loadData = async () => {
  await Promise.allSettled([productsStore.loadProducts(), operationsStore.loadOperations(), wasteStore.loadWastes()])
}
onMounted(loadData)

const entries = computed(() => {
  return getEntries(operationsStore.operations)
})

const exits = computed(() => {
  return getExits(operationsStore.operations)
})
</script>

<template>
  <AppLayout>
    <div class="content">
      <PageHeader :title="t('reporting')" :description="t('reportsSubtitle')" />
      <RequestState :loading="loading" :error="loadError" @retry="loadData" />
      <template v-if="dataReady">
        <div class="report-selector">
          <label for="report-type">{{ t('reportType') }}</label>
          <select id="report-type" v-model="selectedReport">
            <option value="Inventario">{{ t('inventory') }}</option>
            <option value="Entradas">{{ t('entries') }}</option>
            <option value="Salidas">{{ t('exits') }}</option>
            <option value="Mermas">{{ t('waste') }}</option>
          </select>
        </div>
        <div v-if="selectedReport === 'Inventario'">
          <h2>{{ t('inventoryReport') }}</h2>
          <p class="table-hint">{{ t('tableScrollHint') }}</p>
          <div class="table-scroll" role="region" :aria-label="t('tableScrollHint')" tabindex="0">
            <table>
              <thead>
                <tr>
                  <th>{{ t('id') }}</th>
                  <th>{{ t('product') }}</th>
                  <th>{{ t('category') }}</th>
                  <th>{{ t('stock') }}</th>
                  <th>{{ t('price') }}</th>
                  <th>{{ t('status') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="product in productsStore.products" :key="product.id">
                  <td>{{ product.id }}</td>
                  <td>{{ product.name }}</td>
                  <td>{{ translateValue(product.category) }}</td>
                  <td>{{ product.stock }}</td>
                  <td>S/ {{ product.price }}</td>
                  <td>{{ translateValue(product.status) }}</td>
                </tr>
                <tr v-if="productsStore.products.length === 0">
                  <td colspan="6">{{ t('noReportData') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div v-if="selectedReport === 'Entradas'">
          <h2>{{ t('entriesReport') }}</h2>
          <p class="table-hint">{{ t('tableScrollHint') }}</p>
          <div class="table-scroll" role="region" :aria-label="t('tableScrollHint')" tabindex="0">
            <table>
              <thead>
                <tr>
                  <th>{{ t('id') }}</th>
                  <th>{{ t('product') }}</th>
                  <th>{{ t('quantity') }}</th>
                  <th>{{ t('date') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="operation in entries" :key="operation.id">
                  <td>{{ operation.id }}</td>
                  <td>{{ operation.productName }}</td>
                  <td>{{ operation.quantity }}</td>
                  <td>{{ operation.date }}</td>
                </tr>
                <tr v-if="entries.length === 0">
                  <td colspan="4">{{ t('noReportData') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div v-if="selectedReport === 'Salidas'">
          <h2>{{ t('exitsReport') }}</h2>
          <p class="table-hint">{{ t('tableScrollHint') }}</p>
          <div class="table-scroll" role="region" :aria-label="t('tableScrollHint')" tabindex="0">
            <table>
              <thead>
                <tr>
                  <th>{{ t('id') }}</th>
                  <th>{{ t('product') }}</th>
                  <th>{{ t('quantity') }}</th>
                  <th>{{ t('date') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="operation in exits" :key="operation.id">
                  <td>{{ operation.id }}</td>
                  <td>{{ operation.productName }}</td>
                  <td>{{ operation.quantity }}</td>
                  <td>{{ operation.date }}</td>
                </tr>
                <tr v-if="exits.length === 0">
                  <td colspan="4">{{ t('noReportData') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div v-if="selectedReport === 'Mermas'">
          <h2>{{ t('wasteReport') }}</h2>
          <p class="table-hint">{{ t('tableScrollHint') }}</p>
          <div class="table-scroll" role="region" :aria-label="t('tableScrollHint')" tabindex="0">
            <table>
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
                <tr v-for="waste in wasteStore.wastes" :key="waste.id">
                  <td>{{ waste.id }}</td>
                  <td>{{ waste.productName }}</td>
                  <td>{{ waste.quantity }}</td>
                  <td>{{ translateValue(waste.reason) }}</td>
                  <td>{{ waste.date }}</td>
                </tr>
                <tr v-if="wasteStore.wastes.length === 0">
                  <td colspan="5">{{ t('noReportData') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>
  </AppLayout>
</template>

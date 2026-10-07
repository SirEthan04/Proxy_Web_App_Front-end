<script setup>
import { t, translateValue } from '../../i18n.js'

import { computed, onMounted, ref } from 'vue'

import Sidebar from '../../shared/presentation/components/Sidebar.vue'
import Header from '../../shared/presentation/components/Header.vue'
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

onMounted(async () => {
  await productsStore.loadProducts()
  await operationsStore.loadOperations()
  await wasteStore.loadWastes()
})

const entries = computed(() => {
  return getEntries(operationsStore.operations)
})

const exits = computed(() => {
  return getExits(operationsStore.operations)
})
</script>

<template>
  <div class="page">
    <Sidebar />

    <main class="main-content">
      <Header />

      <div class="content">
        <h1>{{ t('reporting') }}</h1>
        <p>{{ t('reportsSubtitle') }}</p>

        <div class="report-selector">
          <label>{{ t('reportType') }}</label>

          <select v-model="selectedReport">
            <option value="Inventario">{{ t('inventory') }}</option>
            <option value="Entradas">{{ t('entries') }}</option>
            <option value="Salidas">{{ t('exits') }}</option>
            <option value="Mermas">{{ t('waste') }}</option>
          </select>
        </div>

        <div v-if="selectedReport === 'Inventario'">
          <h2>{{ t('inventoryReport') }}</h2>

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
            <tr
                v-for="product in productsStore.products"
                :key="product.id"
            >
              <td>{{ product.id }}</td>
              <td>{{ product.name }}</td>
              <td>{{ translateValue(product.category) }}</td>
              <td>{{ product.stock }}</td>
              <td>S/ {{ product.price }}</td>
              <td>{{ translateValue(product.status) }}</td>
            </tr>
            </tbody>
          </table>
        </div>

        <div v-if="selectedReport === 'Entradas'">
          <h2>{{ t('entriesReport') }}</h2>

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
            <tr
                v-for="operation in entries"
                :key="operation.id"
            >
              <td>{{ operation.id }}</td>
              <td>{{ operation.productName }}</td>
              <td>{{ operation.quantity }}</td>
              <td>{{ operation.date }}</td>
            </tr>
            </tbody>
          </table>
        </div>

        <div v-if="selectedReport === 'Salidas'">
          <h2>{{ t('exitsReport') }}</h2>

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
            <tr
                v-for="operation in exits"
                :key="operation.id"
            >
              <td>{{ operation.id }}</td>
              <td>{{ operation.productName }}</td>
              <td>{{ operation.quantity }}</td>
              <td>{{ operation.date }}</td>
            </tr>
            </tbody>
          </table>
        </div>

        <div v-if="selectedReport === 'Mermas'">
          <h2>{{ t('wasteReport') }}</h2>

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
            </tbody>
          </table>
        </div>
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

.report-selector {
  display: flex;
  flex-direction: column;
  width: 250px;
  gap: 8px;
  margin: 25px 0;
}

select {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
}

table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  margin-top: 20px;
}

th,
td {
  padding: 12px;
  border-bottom: 1px solid #ddd;
  text-align: left;
}

th {
  background-color: #f3f4f6;
}
</style>
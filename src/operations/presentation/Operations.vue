<script setup>
import Button from 'primevue/button'
import { t, translateValue } from '../../i18n.js'

import { ref, onMounted } from 'vue'

import Sidebar from '../../shared/presentation/components/Sidebar.vue'
import Header from '../../shared/presentation/components/Header.vue'

import { useProductsStore } from '../../inventory/application/products.js'
import { useOperationsStore } from '../application/operations.js'
import { OPERATION_TYPES } from '../domain/operation.js'
import { getProductStatus } from '../../inventory/domain/product.js'

const productsStore = useProductsStore()
const operationsStore = useOperationsStore()

const selectedProductId = ref('')
const operationType = ref('')
const quantity = ref('')

onMounted(async () => {
  await productsStore.loadProducts()
  await operationsStore.loadOperations()
})

const saveOperation = async () => {
  if (
      !selectedProductId.value ||
      !operationType.value ||
      quantity.value === ''
  ) {
    alert(t('requiredFields'))
    return
  }

  const product = productsStore.products.find(
      product => Number(product.id) === Number(selectedProductId.value)
  )

  if (!product) {
    alert(t('productNotFound'))
    return
  }

  const amount = Number(quantity.value)

  if (amount <= 0) {
    alert(t('positiveQuantity'))
    return
  }

  let newStock = Number(product.stock)

  if (operationType.value === OPERATION_TYPES.ENTRY) {
    newStock += amount
  }

  if (operationType.value === OPERATION_TYPES.EXIT) {
    if (amount > Number(product.stock)) {
      alert(t('insufficientStock'))
      return
    }

    newStock -= amount
  }

  await productsStore.updateProduct(product.id, {
    ...product,
    stock: newStock,
    status: getProductStatus(newStock)
  })

  await operationsStore.addOperation({
    productId: product.id,
    productName: product.name,
    type: operationType.value,
    quantity: amount
  })

  selectedProductId.value = ''
  operationType.value = ''
  quantity.value = ''

  alert(t('operationSaved'))
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

        <div class="form">
          <label>{{ t('product') }}</label>

          <select v-model="selectedProductId">
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

          <select v-model="operationType">
            <option value="">{{ t('selectOperation') }}</option>

            <option :value="OPERATION_TYPES.ENTRY">
              {{ translateValue(OPERATION_TYPES.ENTRY) }}
            </option>

            <option :value="OPERATION_TYPES.EXIT">
              {{ translateValue(OPERATION_TYPES.EXIT) }}
            </option>
          </select>

          <label>{{ t('quantity') }}</label>

          <input
              v-model="quantity"
              type="number"
              :placeholder="t('quantity')"
          >

          <Button
              class="save-btn"
              @click="saveOperation"
          >
            {{ t('registerOperation') }}
          </Button>
        </div>

        <h2>{{ t('operationHistory') }}</h2>

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
<script setup>
import Button from 'primevue/button'
import { t, translateValue } from '../../i18n.js'

import { ref, onMounted } from 'vue'

import Sidebar from '../../shared/presentation/components/Sidebar.vue'
import Header from '../../shared/presentation/components/Header.vue'

import { useProductsStore } from '../../inventory/application/products.js'
import { useWasteStore } from '../application/waste.js'
import { WASTE_REASONS } from '../domain/waste.js'
import { getProductStatus } from '../../inventory/domain/product.js'

const productsStore = useProductsStore()
const wasteStore = useWasteStore()

const selectedProductId = ref('')
const quantity = ref('')
const reason = ref('')

onMounted(async () => {
  await productsStore.loadProducts()
  await wasteStore.loadWastes()
})

const saveWaste = async () => {
  if (
      !selectedProductId.value ||
      quantity.value === '' ||
      !reason.value
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

  if (amount > Number(product.stock)) {
    alert(t('wasteExceedsStock'))
    return
  }

  const newStock = Number(product.stock) - amount

  await productsStore.updateProduct(product.id, {
    ...product,
    stock: newStock,
    status: getProductStatus(newStock)
  })

  await wasteStore.addWaste({
    productId: product.id,
    productName: product.name,
    quantity: amount,
    reason: reason.value
  })

  selectedProductId.value = ''
  quantity.value = ''
  reason.value = ''

  alert(t('wasteSaved'))
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

          <label>{{ t('quantity') }}</label>

          <input
              v-model="quantity"
              type="number"
              :placeholder="t('quantity')"
          >

          <label>{{ t('reason') }}</label>

          <select v-model="reason">
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
              class="save-btn"
              @click="saveWaste"
          >
            {{ t('registerWaste') }}
          </Button>
        </div>

        <h2>{{ t('wasteHistory') }}</h2>

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
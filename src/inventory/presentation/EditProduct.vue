<script setup>
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { t } from '../../i18n.js'

import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProductStatus } from '../domain/product.js'
import Sidebar from '../../shared/presentation/components/Sidebar.vue'
import Header from '../../shared/presentation/components/Header.vue'

import { useProductsStore } from '../application/products.js'

const route = useRoute()
const router = useRouter()
const productsStore = useProductsStore()

const id = Number(route.params.id)

const name = ref('')
const category = ref('')
const price = ref('')
const stock = ref('')
const expirationDate = ref('')

onMounted(async () => {
  await productsStore.loadProducts()

  const product = productsStore.products.find(
      product => Number(product.id) === id
  )
  if (!product) {
    alert(t('productNotFound'))
    router.push('/products')
    return
  }

  name.value = product.name
  category.value = product.category
  price.value = product.price
  stock.value = product.stock
  expirationDate.value = product.expirationDate
})

const updateProduct = async () => {
  if (
      !name.value ||
      !category.value ||
      price.value === '' ||
      stock.value === '' ||
      !expirationDate.value
  ) {
    alert(t('requiredFields'))
    return
  }

  await productsStore.updateProduct(id, {
    name: name.value,
    category: category.value,
    price: Number(price.value),
    stock: Number(stock.value),
    expirationDate: expirationDate.value,
    status: getProductStatus(Number(stock.value))
  })

  router.push('/products')
}
</script>

<template>
  <div class="layout">

    <Sidebar />

    <div class="main">

      <Header />

      <div class="content">

        <h1>{{ t('editProduct') }}</h1>
        <p>{{ t('editProductSubtitle') }}</p>

        <div class="form-box">

          <label>{{ t('name') }}</label>
          <InputText
              v-model="name"
              type="text" />

          <label>{{ t('category') }}</label>
          <select v-model="category">
            <option value="Bebidas">
              {{ t('beverages') }}
            </option>

            <option value="Lácteos">
              {{ t('dairy') }}
            </option>

            <option value="Panadería">
              {{ t('bakery') }}
            </option>

            <option value="Abarrotes">
              {{ t('groceries') }}
            </option>

            <option value="Galletas">
              {{ t('cookies') }}
            </option>

            <option value="Conservas">
              {{ t('cannedGoods') }}
            </option>

            <option value="Dulces">
              {{ t('sweets') }}
            </option>
          </select>

          <label>{{ t('price') }}</label>
          <input
              v-model="price"
              type="number"
              step="0.01"
          >

          <label>{{ t('stock') }}</label>
          <input
              v-model="stock"
              type="number"
          >

          <label>{{ t('expirationDate') }}</label>
          <input
              v-model="expirationDate"
              type="date"
          >

          <div class="buttons">
            <Button
                class="cancel-btn"
                @click="router.push('/products')"
            >
              {{ t('cancel') }}
            </Button>

            <Button
                class="save-btn"
                @click="updateProduct"
            >
              {{ t('saveChanges') }}
            </Button>
          </div>

        </div>

      </div>

    </div>

  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}

.main {
  flex: 1;
  background: #f4f7fb;
}

.content {
  padding: 30px;
}

.content p {
  color: #64748b;
}

.form-box {
  margin-top: 25px;
  background: white;
  padding: 25px;
  border-radius: 10px;
  max-width: 600px;
}

label {
  display: block;
  margin-top: 15px;
  margin-bottom: 7px;
}

input,
select {
  width: 100%;
  padding: 11px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
}

.cancel-btn {
  background-color: #6b7280;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 6px;
  cursor: pointer;
}

.save-btn {
  background-color: #16a34a;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 6px;
  cursor: pointer;
}

.cancel-btn:hover {
  background-color: #4b5563;
}

.save-btn:hover {
  background-color: #15803d;
}
</style>
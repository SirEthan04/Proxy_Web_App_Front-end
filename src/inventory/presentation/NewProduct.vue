<script setup>
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { t } from '../../i18n.js'

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getProductStatus } from '../domain/product.js'
import Sidebar from '../../shared/presentation/components/Sidebar.vue'
import Header from '../../shared/presentation/components/Header.vue'
import { useProductsStore } from '../application/products.js'

const router = useRouter()
const productsStore = useProductsStore()

const name = ref('')
const category = ref('')
const price = ref('')
const stock = ref('')
const expirationDate = ref('')

const saveProduct = async () => {
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

  await productsStore.addProduct({
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
  <div class="page">
    <Sidebar />

    <main class="main-content">
      <Header />

      <div class="content">
        <h1>{{ t('newProduct') }}</h1>

        <div class="form">
          <label>{{ t('name') }}</label>
          <InputText
              v-model="name"
              type="text"
              :placeholder="t('productName')" />

          <label>{{ t('category') }}</label>
          <select v-model="category">
            <option value="">{{ t('selectCategory') }}</option>
            <option value="Bebidas">{{ t('beverages') }}</option>
            <option value="Lácteos">{{ t('dairy') }}</option>
            <option value="Panadería">{{ t('bakery') }}</option>
            <option value="Abarrotes">{{ t('groceries') }}</option>
            <option value="Galletas">{{ t('cookies') }}</option>
            <option value="Conservas">{{ t('cannedGoods') }}</option>
            <option value="Dulces">{{ t('sweets') }}</option>
            <option value="Limpieza">{{ t('cleaning') }}</option>
            <option value="Snacks">{{ t('snacks') }}</option>
          </select>

          <label>{{ t('price') }}</label>
          <input
              v-model="price"
              type="number"
              :placeholder="t('price')"
          >

          <label>{{ t('stock') }}</label>
          <input
              v-model="stock"
              type="number"
              :placeholder="t('stock')"
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
                @click="saveProduct"
            >
              {{ t('saveProduct') }}
            </Button>
          </div>
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

.form {
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

input,
select {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.buttons {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.cancel-btn {
  background-color: #6b7280;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 6px;
  cursor: pointer;
}

.cancel-btn:hover {
  background-color: #4b5563;
}

.save-btn {
  background-color: #16a34a;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.save-btn:hover {
  background-color: #15803d;
}
</style>
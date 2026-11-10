<script setup>
import { ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { useProductsStore } from '../../application/inventory.js'
import { useAuthStore } from '../../../iam/application/auth.js'
import { PERMISSIONS } from '../../../iam/domain/permissions.js'
const store = useProductsStore()
const auth = useAuthStore()
const name = ref('')
const description = ref('')
const message = ref('')
async function save() {
  message.value = ''
  try { await store.addCategory(name.value, description.value); name.value = ''; description.value = ''; message.value = 'Categoría registrada.' }
  catch (error) { message.value = error.message }
}
</script>
<template>
  <details class="panel inventory-categories">
    <summary>Categorías</summary>
    <p v-if="!store.loading && !store.loadError && !store.categories.length">No hay categorías registradas.</p>
    <ul class="category-list"><li v-for="category in store.categories" :key="category.id"><strong>{{ category.name }}</strong><span v-if="category.description">{{ category.description }}</span> {{ category.active ? '' : '(Inactiva)' }}</li></ul>
    <form v-if="auth.can(PERMISSIONS.PRODUCTS_CREATE)" class="form-grid" @submit.prevent="save">
      <div class="field"><label for="category-name">Nombre</label><InputText id="category-name" v-model="name" maxlength="100" required :disabled="store.saving" /></div>
      <div class="field"><label for="category-description">Descripción</label><InputText id="category-description" v-model="description" maxlength="255" :disabled="store.saving" /></div>
      <Button type="submit" :disabled="store.saving || store.loading || !!store.loadError" :loading="store.saving">Registrar categoría</Button>
      <p role="status">{{ message }}</p>
    </form>
    <p>La API no ofrece edición ni eliminación de categorías.</p>
  </details>
</template>

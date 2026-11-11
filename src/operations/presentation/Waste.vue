<script setup>
import { onMounted } from 'vue'
import Button from 'primevue/button'
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'
import { useProductsStore } from '../../inventory/application/inventory.js'
import { useRealOperationsStore } from '../application/real-operations.js'
import PreparedOperationForm from './components/PreparedOperationForm.vue'
const store = useRealOperationsStore(), inventory = useProductsStore()
const productName = id => inventory.products.find(p => p.id === id)?.name || id
onMounted(() => store.loadWastes())
</script>
<template>
  <AppLayout><div class="content">
    <PageHeader title="Mermas" description="Mermas reales registradas en el backend."><template #actions><Button class="cancel-btn" :disabled="store.loadingWastes" @click="store.loadWastes()">Recargar mermas</Button></template></PageHeader>
    <PreparedOperationForm kind="waste" />
    <h2>Historial de mermas</h2>
    <RequestState :loading="store.loadingWastes" :error="store.wastesError" @retry="store.loadWastes()" />
    <div v-if="!store.loadingWastes && !store.wastesError" class="table-scroll" role="region" aria-label="Historial de mermas" tabindex="0"><table><thead><tr><th>GUID</th><th>Producto</th><th>Lote</th><th>Usuario</th><th>Cantidad</th><th>Motivo</th><th>Fecha</th></tr></thead><tbody>
      <tr v-for="w in store.wastes" :key="w.id"><td>{{ w.id }}</td><td><router-link :to="'/products/' + w.productId">{{ !inventory.loadError && !inventory.loading ? productName(w.productId) : w.productId }}</router-link><small class="cell-secondary">{{ w.productId }}</small></td><td>{{ w.lotId || 'Sin lote específico' }}</td><td>{{ w.userId }}</td><td>{{ w.quantity }}</td><td>{{ w.reason }}</td><td>{{ w.registeredAt }}</td></tr>
      <tr v-if="!store.wastes.length"><td colspan="7" class="empty" role="status">No hay mermas registradas.</td></tr>
    </tbody></table></div>
  </div></AppLayout>
</template>

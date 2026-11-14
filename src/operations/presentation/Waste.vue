<script setup>
import { ref, onMounted } from 'vue'
import Button from 'primevue/button'
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'
import RecordDetails from '../../shared/presentation/components/RecordDetails.vue'
import { useProductsStore } from '../../inventory/application/inventory.js'
import { useRealOperationsStore } from '../application/real-operations.js'
import { useRecordLabels } from '../../shared/presentation/utils/record-labels.js'
import { formatDate, formatQuantity } from '../../shared/presentation/utils/presentation.js'
import PreparedOperationForm from './components/PreparedOperationForm.vue'
const store = useRealOperationsStore(), inventory = useProductsStore(), labels = useRecordLabels()
const details = ref({}), showDetails = ref(false)
async function load() { await store.loadWastes(); await labels.loadRelated() }
function show(w) {
  details.value = { 'Producto': labels.product(w.productId), 'Responsable': labels.responsible(w.userId), 'Motivo': w.reason, 'Fecha': formatDate(w.registeredAt), 'Identificador de la merma': w.id, 'Identificador del producto': w.productId, 'Identificador del lote': w.lotId, 'Identificador del responsable': w.userId, 'Fecha original': w.registeredAt }; showDetails.value = true
}
onMounted(load)
</script>
<template>
  <AppLayout><div class="content">
    <PageHeader title="Mermas" description="Registra pérdidas y revisa el historial de tus productos."><template #actions><Button class="cancel-btn" :disabled="store.loadingWastes" @click="load">Actualizar historial</Button></template></PageHeader>
    <PreparedOperationForm kind="waste" @registered="labels.loadRelated()" />
    <h2>Historial de mermas</h2>
    <RequestState :loading="store.loadingWastes" :error="store.wastesError" @retry="load" />
    <div v-if="!store.loadingWastes && !store.wastesError" class="table-scroll" role="region" aria-label="Historial de mermas" tabindex="0"><table class="readable-table"><thead><tr><th>Producto</th><th>Cantidad</th><th>Motivo</th><th>Fecha</th><th>Responsable</th><th>Acciones</th></tr></thead><tbody>
      <tr v-for="w in store.wastes" :key="w.id"><td><router-link class="name-truncate" :title="labels.product(w.productId)" :to="'/products/' + w.productId">{{ labels.product(w.productId) }}</router-link></td><td class="quantity-negative quantity-cell">{{ formatQuantity(-w.quantity, true) }}</td><td><span class="name-truncate" :title="w.reason">{{ w.reason }}</span></td><td class="date-cell">{{ formatDate(w.registeredAt) }}</td><td>{{ labels.responsible(w.userId) }}</td><td><Button text @click="show(w)">Ver detalles</Button></td></tr>
      <tr v-if="!store.wastes.length"><td colspan="6" class="empty" role="status">No hay mermas registradas.</td></tr>
    </tbody></table></div>
    <RecordDetails v-model:visible="showDetails" title="Detalle de merma" :fields="details" />
  </div></AppLayout>
</template>

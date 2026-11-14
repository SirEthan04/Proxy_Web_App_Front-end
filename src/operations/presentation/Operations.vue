<script setup>
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'
import RecordDetails from '../../shared/presentation/components/RecordDetails.vue'
import { useProductsStore } from '../../inventory/application/inventory.js'
import { useRealOperationsStore } from '../application/real-operations.js'
import { movementLabels, statusLabel, typeLabel, recordReference, formatDate, formatQuantity, filterMovements } from '../../shared/presentation/utils/presentation.js'
import { useRecordLabels } from '../../shared/presentation/utils/record-labels.js'
import PreparedOperationForm from './components/PreparedOperationForm.vue'
const store = useRealOperationsStore(), inventory = useProductsStore(), labels = useRecordLabels()
const tab = ref('movements'), search = ref(''), countId = ref(''), type = ref(''), from = ref(''), to = ref('')
const details = ref({}), showDetails = ref(false)
const query = computed(() => filterMovements(store.movements, { search: search.value, type: type.value, from: from.value, to: to.value }, inventory.loadError ? [] : inventory.products))
const loadInventory = async () => { try { await inventory.loadProducts(); await labels.loadRelated() } catch { /* RequestState displays catalog errors. */ } }
const load = () => Promise.allSettled([store.loadMovements(), loadInventory()])
function show(fields) { details.value = fields; showDetails.value = true }
function movementDetails(m) {
  show({ 'Producto': labels.product(m.productId), 'Tipo': typeLabel(m.movementType), 'Cantidad': formatQuantity(m.quantityDelta, true), 'Fecha': formatDate(m.createdAt), 'Responsable': labels.responsible(m.userId), 'Lote': labels.lot(m.lotId), 'Identificador del movimiento': m.id, 'Identificador del producto': m.productId, 'Identificador del lote': m.lotId, 'Identificador del responsable': m.userId, 'Operación de origen': recordReference(m.sourceType, m.sourceId), 'Identificador de origen': m.sourceId, 'Fecha original': m.createdAt })
}
onMounted(load)
</script>
<template>
  <AppLayout><div class="content">
    <PageHeader title="Movimientos y conteos" description="Consulta las entradas, salidas y conteos de tu bodega."><template #actions><Button class="cancel-btn" :disabled="store.loadingMovements || inventory.loading || store.loadingCount" @click="load">Actualizar</Button></template></PageHeader>
    <div class="alert-filter-buttons" role="group" aria-label="Tipo de consulta"><Button :outlined="tab !== 'movements'" :aria-pressed="tab === 'movements'" @click="tab = 'movements'">Movimientos</Button><Button :outlined="tab !== 'counts'" :aria-pressed="tab === 'counts'" @click="tab = 'counts'">Conteos físicos</Button></div>
    <RequestState :loading="inventory.loading" :error="inventory.loadError" @retry="loadInventory" />
    <template v-if="tab === 'movements'">
      <section class="panel report-filters">
        <div class="field"><label for="movement-search">Buscar producto u operación</label><InputText id="movement-search" v-model="search" type="search" placeholder="Nombre del producto o referencia" /></div>
        <div class="field"><label for="movement-type">Tipo</label><select id="movement-type" v-model="type"><option value="">Todos los tipos</option><option v-for="(label, key) in movementLabels" :key="key" :value="key">{{ label }}</option></select></div>
        <div class="field"><label for="movement-from">Desde</label><InputText id="movement-from" v-model="from" type="date" /></div>
        <div class="field"><label for="movement-to">Hasta</label><InputText id="movement-to" v-model="to" type="date" /></div>
        <Button text @click="search = ''; type = ''; from = ''; to = ''">Limpiar filtros</Button>
      </section>
      <p v-if="query.error" class="field-error" role="alert">{{ query.error }}</p>
      <RequestState :loading="store.loadingMovements" :error="store.movementsError" @retry="store.loadMovements()" />
      <template v-if="!store.loadingMovements && !store.movementsError && !query.error">
        <p class="results-summary" aria-live="polite">{{ query.rows.length }} movimientos · horario de Perú</p>
        <div class="table-scroll" role="region" aria-label="Movimientos" tabindex="0"><table class="readable-table"><thead><tr><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Fecha</th><th>Origen</th><th>Acciones</th></tr></thead><tbody>
          <tr v-for="m in query.rows" :key="m.id"><td><router-link class="name-truncate" :title="labels.product(m.productId)" :to="'/products/' + m.productId">{{ labels.product(m.productId) }}</router-link></td><td><span class="status-pill">{{ typeLabel(m.movementType) }}</span></td><td class="quantity-cell" :class="m.quantityDelta > 0 ? 'quantity-positive' : 'quantity-negative'">{{ formatQuantity(m.quantityDelta, true) }}</td><td class="date-cell">{{ formatDate(m.createdAt) }}</td><td>{{ recordReference(m.sourceType, m.sourceId) }}</td><td><Button text @click="movementDetails(m)">Ver detalles</Button></td></tr>
          <tr v-if="!query.rows.length"><td colspan="6" class="empty" role="status">{{ store.movements.length ? 'No hay movimientos para estos filtros.' : 'No hay movimientos registrados.' }}</td></tr>
        </tbody></table></div>
      </template>
    </template>
    <template v-else>
      <p class="panel">Compara lo que hay en tu bodega con las existencias registradas. El conteo registra diferencias; no cambia el stock.</p>
      <details class="panel"><summary>Consultar un conteo anterior</summary><form class="report-filters" @submit.prevent="store.loadCount(countId)"><div class="field"><label for="count-id">Identificador completo del conteo</label><InputText id="count-id" v-model="countId" :disabled="store.loadingCount" placeholder="Pega el identificador del registro" /></div><Button type="submit" :disabled="store.loadingCount">Consultar conteo</Button></form></details>
      <RequestState :loading="store.loadingCount" :error="store.countError" @retry="store.loadCount(countId)" />
      <section v-if="store.count && !store.loadingCount && !store.countError" class="panel">
        <div class="section-heading"><h2>{{ recordReference('count', store.count.id) }}</h2><Button text @click="show({ 'Identificador del conteo': store.count.id, 'Responsable': labels.responsible(store.count.userId), 'Identificador del responsable': store.count.userId, 'Fecha original': store.count.countedAt })">Ver datos del registro</Button></div>
        <p><span class="status-pill">{{ statusLabel(store.count.status, 'count') }}</span> · {{ formatDate(store.count.countedAt) }}</p><p>Responsable: {{ labels.responsible(store.count.userId) }}</p><p>{{ store.count.notes || 'Sin observaciones' }}</p>
        <div class="table-scroll" role="region" aria-label="Resultado del conteo" tabindex="0"><table class="readable-table"><thead><tr><th>Producto</th><th>Lote</th><th>Stock registrado</th><th>Cantidad contada</th><th>Diferencia</th><th>Acciones</th></tr></thead><tbody><tr v-for="item in store.count.items" :key="item.id"><td><span class="name-truncate" :title="labels.product(item.productId)">{{ labels.product(item.productId) }}</span></td><td>{{ item.lotId ? labels.lot(item.lotId) : 'Todo el producto' }}</td><td>{{ formatQuantity(item.expectedQuantity) }}</td><td>{{ formatQuantity(item.countedQuantity) }}</td><td class="quantity-cell" :class="item.difference < 0 ? 'quantity-negative' : ''">{{ formatQuantity(item.difference, true) }}</td><td><Button text @click="show({ 'Identificador del detalle': item.id, 'Identificador del producto': item.productId, 'Identificador del lote': item.lotId })">Ver detalles</Button></td></tr><tr v-if="!store.count.items.length"><td colspan="6" class="empty">Este conteo no tiene detalles.</td></tr></tbody></table></div>
      </section>
      <PreparedOperationForm kind="count" />
    </template>
    <RecordDetails v-model:visible="showDetails" :fields="details" />
  </div></AppLayout>
</template>

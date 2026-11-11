<script setup>
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'
import { useProductsStore } from '../../inventory/application/inventory.js'
import { useRealOperationsStore } from '../application/real-operations.js'
import { movementLabels, countLabels } from '../domain/real-operations.js'
import PreparedOperationForm from './components/PreparedOperationForm.vue'
const store = useRealOperationsStore(), inventory = useProductsStore()
const tab = ref('movements'), search = ref(''), countId = ref('')
const productName = id => !inventory.loading && !inventory.loadError ? inventory.products.find(p => p.id === id)?.name || id : id
const rows = computed(() => store.movements.filter(m => [m.productId, productName(m.productId), m.sourceId, m.movementType].some(v => v.toLowerCase().includes(search.value.toLowerCase().trim()))))
const loadInventory = async () => { try { await inventory.loadProducts() } catch { /* RequestState displays the error. */ } }
const load = () => Promise.allSettled([store.loadMovements(), loadInventory()])
onMounted(load)
</script>
<template>
  <AppLayout><div class="content">
    <PageHeader title="Movimientos y conteos" description="Operaciones registradas en el backend ASP.NET Core."><template #actions><Button class="cancel-btn" :disabled="store.loadingMovements || inventory.loading || store.loadingCount" @click="load">Recargar movimientos y productos</Button></template></PageHeader>
    <div class="alert-filter-buttons" role="group" aria-label="Tipo de consulta"><Button :outlined="tab !== 'movements'" @click="tab = 'movements'">Movimientos</Button><Button :outlined="tab !== 'counts'" @click="tab = 'counts'">Conteos físicos</Button></div>
    <RequestState :loading="inventory.loading" :error="inventory.loadError" @retry="loadInventory" />
    <p v-if="inventory.loadError" class="report-notice">Los productos se muestran por GUID hasta recuperar el catálogo.</p>
    <template v-if="tab === 'movements'">
      <p class="panel">Solo lectura: los movimientos se generan en el backend desde sus operaciones de origen. No se registran entradas o salidas manuales desde esta pantalla.</p>
      <div class="panel field"><label for="movement-search">Buscar producto, tipo u origen</label><InputText id="movement-search" v-model="search" type="search" /></div>
      <RequestState :loading="store.loadingMovements" :error="store.movementsError" @retry="store.loadMovements()" />
      <div v-if="!store.loadingMovements && !store.movementsError" class="table-scroll" role="region" aria-label="Movimientos" tabindex="0"><table><thead><tr><th>GUID</th><th>Producto</th><th>Lote</th><th>Tipo</th><th>Cantidad (variación)</th><th>Fecha</th><th>Origen</th></tr></thead><tbody>
        <tr v-for="m in rows" :key="m.id"><td>{{ m.id }}</td><td><router-link :to="'/products/' + m.productId">{{ productName(m.productId) }}</router-link><small class="cell-secondary">{{ m.productId }}</small></td><td>{{ m.lotId || 'Sin lote' }}</td><td><span class="status-pill">{{ movementLabels[m.movementType] || m.movementType }}</span></td><td>{{ m.quantityDelta }}</td><td>{{ m.createdAt }}</td><td>{{ m.sourceType }}<small class="cell-secondary">{{ m.sourceId }}</small></td></tr>
        <tr v-if="!rows.length"><td colspan="7" class="empty" role="status">{{ store.movements.length ? 'No hay coincidencias para la búsqueda.' : 'No hay movimientos registrados.' }}</td></tr>
      </tbody></table></div>
    </template>
    <template v-else>
      <p class="panel">El backend permite consultar un conteo por GUID; no ofrece un listado de conteos. Los conteos registran diferencias sin ajustar stock ni generar movimientos.</p>
      <form class="panel report-filters" @submit.prevent="store.loadCount(countId)"><div class="field"><label for="count-id">GUID de un conteo existente</label><InputText id="count-id" v-model="countId" :disabled="store.loadingCount" /></div><Button type="submit" :disabled="store.loadingCount">Consultar / Recargar conteo</Button></form>
      <RequestState :loading="store.loadingCount" :error="store.countError" @retry="store.loadCount(countId)" />
      <section v-if="store.count && !store.loadingCount && !store.countError" class="panel">
        <h2>Conteo {{ store.count.id }}</h2><p>{{ countLabels[store.count.status] || store.count.status }} — {{ store.count.countedAt }}</p><p>Usuario: {{ store.count.userId }}</p><p>{{ store.count.notes || 'Sin notas' }}</p>
        <div class="table-scroll" role="region" aria-label="Detalles del conteo" tabindex="0"><table><thead><tr><th>Producto</th><th>Lote</th><th>Esperado</th><th>Físico</th><th>Diferencia</th></tr></thead><tbody><tr v-for="item in store.count.items" :key="item.id"><td>{{ productName(item.productId) }}<small class="cell-secondary">{{ item.productId }}</small></td><td>{{ item.lotId || 'Total del producto' }}</td><td>{{ item.expectedQuantity }}</td><td>{{ item.countedQuantity }}</td><td>{{ item.difference }}</td></tr><tr v-if="!store.count.items.length"><td colspan="5" class="empty">El conteo no tiene detalles.</td></tr></tbody></table></div>
      </section>
      <PreparedOperationForm kind="count" />
    </template>
  </div></AppLayout>
</template>

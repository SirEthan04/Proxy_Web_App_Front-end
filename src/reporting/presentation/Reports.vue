<script setup>
import { computed, ref, onMounted } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'
import StatCard from '../../shared/presentation/components/StatCard.vue'
import { downloadCsv } from '../../shared/presentation/utils/csv-export.js'
import { useReportsStore } from '../application/reports.js'
import { formatSoles, formatDate, formatQuantity } from '../../shared/presentation/utils/presentation.js'
import RecordDetails from '../../shared/presentation/components/RecordDetails.vue'
const store = useReportsStore()
const selectedProduct = ref(null), showDetails = ref(false)
const from = ref(''), to = ref(''), limit = ref(10)
const load = () => store.loadReports({ from: from.value, to: to.value, limit: limit.value })
const clear = () => { from.value = ''; to.value = ''; limit.value = 10; load() }
const maxQuantity = computed(() => Math.max(1, ...store.topProducts.map(p => p.quantitySold)))
const exportReport = () => {
  if (!store.summary || store.loading || store.loadError) return
  downloadCsv('bodego-ventas.csv', [
    { header: 'Desde (inclusivo)', value: () => store.appliedFilters.from || '' },
    { header: 'Hasta (inclusivo)', value: () => store.appliedFilters.to || '' },
    { header: 'Ventas confirmadas', value: r => r.salesCount },
    { header: 'Importe total (PEN)', value: r => r.totalAmount }
  ], [store.summary])
}
onMounted(load)
</script>
<template>
  <AppLayout><div class="content">
    <PageHeader title="Reportes" description="Resumen de ventas confirmadas y productos más vendidos."><template #actions><Button class="cancel-btn" :disabled="store.loading" @click="load">Recargar</Button><Button class="new-btn" :disabled="store.loading || !!store.loadError || !store.summary" @click="exportReport">Exportar resumen CSV</Button></template></PageHeader>
    <div class="quick-actions"><router-link class="quick-action" to="/purchases">Compras</router-link><router-link class="quick-action" to="/sales">Ventas</router-link></div>
    <form class="panel report-filters" @submit.prevent="load">
      <div class="field"><label for="report-from">Desde</label><InputText id="report-from" v-model="from" type="date" min="1000-01-01" max="9999-12-31" :disabled="store.loading" /></div>
      <div class="field"><label for="report-to">Hasta</label><InputText id="report-to" v-model="to" type="date" min="1000-01-01" max="9999-12-31" :disabled="store.loading" /></div>
      <div class="field"><label for="report-limit">Máximo de productos (1–100)</label><InputText id="report-limit" v-model="limit" type="number" min="1" max="100" step="1" :disabled="store.loading" /></div>
      <div class="filter-actions"><Button type="submit" :disabled="store.loading">Aplicar filtros</Button><Button text :disabled="store.loading" @click="clear">Limpiar filtros</Button></div>
    </form>
    <RequestState :loading="store.loading" :error="store.loadError" @retry="load" />
    <template v-if="!store.loading && !store.loadError && store.summary">
      <p class="results-summary">Periodo consultado: {{ store.appliedFilters.from ? formatDate(store.appliedFilters.from) : 'Sin inicio' }} — {{ store.appliedFilters.to ? formatDate(store.appliedFilters.to) : 'Sin fin' }}. Solo ventas confirmadas.</p>
      <div class="stats-grid report-stats"><StatCard label="Ventas confirmadas" :value="store.summary.salesCount" icon="reports" /><StatCard label="Importe total" :value="formatSoles(store.summary.totalAmount)" icon="sale" /></div>
      <p v-if="store.summary.salesCount === 0" class="panel empty" role="status">No hay ventas confirmadas para este periodo.</p>
      <section class="panel"><h2>Productos más vendidos</h2><p>Unidades vendidas en ventas confirmadas. Máximo {{ store.appliedFilters.limit }} productos.</p>
        <div v-if="store.topProducts.length" class="table-scroll" role="region" aria-label="Productos más vendidos" tabindex="0"><table><thead><tr><th>Producto</th><th>Detalles</th><th>Unidades vendidas</th><th>Comparación de unidades</th></tr></thead><tbody><tr v-for="product in store.topProducts" :key="product.productId"><td><router-link class="name-truncate" :title="product.productName" :to="'/products/' + product.productId">{{ product.productName }}</router-link></td><td><Button text @click="selectedProduct = product; showDetails = true">Ver detalles</Button></td><td>{{ formatQuantity(product.quantitySold) }}</td><td><meter min="0" :max="maxQuantity" :value="product.quantitySold" :aria-label="product.productName + ': ' + product.quantitySold + ' unidades'">{{ product.quantitySold }}</meter></td></tr></tbody></table></div>
        <p v-else class="empty" role="status">No hay productos vendidos para este periodo.</p>
      </section>
      <div class="quick-actions"><router-link class="quick-action" to="/operations">Ver movimientos</router-link><router-link class="quick-action" to="/waste">Ver mermas</router-link></div>
    </template>
    <RecordDetails v-model:visible="showDetails" title="Producto más vendido" :fields="selectedProduct ? { 'Producto': selectedProduct.productName, 'Identificador del producto': selectedProduct.productId, 'Cantidad vendida': formatQuantity(selectedProduct.quantitySold) } : {}" />
  </div></AppLayout>
</template>

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
const store = useReportsStore()
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
    <PageHeader title="Reportes" description="Ventas confirmadas del backend. Fechas inicial y final inclusivas."><template #actions><Button class="cancel-btn" :disabled="store.loading" @click="load">Recargar</Button><Button class="new-btn" :disabled="store.loading || !!store.loadError || !store.summary" @click="exportReport">Exportar resumen CSV</Button></template></PageHeader>
    <div class="quick-actions"><router-link class="quick-action" to="/purchases">Compras</router-link><router-link class="quick-action" to="/sales">Ventas</router-link></div>
    <form class="panel report-filters" @submit.prevent="load">
      <div class="field"><label for="report-from">Desde</label><InputText id="report-from" v-model="from" type="date" min="1000-01-01" max="9999-12-31" :disabled="store.loading" /></div>
      <div class="field"><label for="report-to">Hasta</label><InputText id="report-to" v-model="to" type="date" min="1000-01-01" max="9999-12-31" :disabled="store.loading" /></div>
      <div class="field"><label for="report-limit">Máximo de productos (1–100)</label><InputText id="report-limit" v-model="limit" type="number" min="1" max="100" step="1" :disabled="store.loading" /></div>
      <div class="filter-actions"><Button type="submit" :disabled="store.loading">Aplicar filtros</Button><Button text :disabled="store.loading" @click="clear">Limpiar filtros</Button></div>
    </form>
    <RequestState :loading="store.loading" :error="store.loadError" @retry="load" />
    <template v-if="!store.loading && !store.loadError && store.summary">
      <p class="results-summary">Periodo consultado: {{ store.appliedFilters.from || 'Sin inicio' }} — {{ store.appliedFilters.to || 'Sin fin' }}. Solo ventas confirmadas.</p>
      <div class="stats-grid report-stats"><StatCard label="Ventas confirmadas" :value="store.summary.salesCount" icon="reports" /><StatCard label="Importe total" :value="'S/ ' + store.summary.totalAmount.toFixed(2)" icon="sale" /></div>
      <p v-if="store.summary.salesCount === 0" class="panel empty" role="status">No hay ventas confirmadas para este periodo.</p>
      <section class="panel"><h2>Productos más vendidos</h2><p>Unidades vendidas en ventas confirmadas. Máximo {{ store.appliedFilters.limit }} productos.</p>
        <div v-if="store.topProducts.length" class="table-scroll" role="region" aria-label="Productos más vendidos" tabindex="0"><table><thead><tr><th>Producto</th><th>GUID</th><th>Unidades vendidas</th><th>Comparación de unidades</th></tr></thead><tbody><tr v-for="product in store.topProducts" :key="product.productId"><td>{{ product.productName }}</td><td>{{ product.productId }}</td><td>{{ product.quantitySold }}</td><td><meter min="0" :max="maxQuantity" :value="product.quantitySold" :aria-label="product.productName + ': ' + product.quantitySold + ' unidades'">{{ product.quantitySold }}</meter></td></tr></tbody></table></div>
        <p v-else class="empty" role="status">No hay productos vendidos para este periodo.</p>
      </section>
      <p class="report-notice">Los reportes de movimientos y mermas no están disponibles en estos endpoints. Consúltalos en sus módulos de demostración.</p>
    </template>
  </div></AppLayout>
</template>

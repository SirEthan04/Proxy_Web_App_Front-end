<script setup>
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'
import { t, translateValue } from '../../i18n.js'
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'
import StatCard from '../../shared/presentation/components/StatCard.vue'
import { downloadCsv } from '../../shared/presentation/utils/csv-export.js'
import { useProductsStore } from '../../inventory/application/products.js'
import { useOperationsStore } from '../../operations/application/operations.js'
import { useWasteStore } from '../../operations/application/waste.js'
import { queryRecords, parseRecordDate, summarizeRecords, groupRecordsByProduct } from '../application/reports.js'
const products = useProductsStore()
const operations = useOperationsStore()
const wastes = useWasteStore()
const selectedReport = ref('Inventario')
const from = ref('')
const to = ref('')
const movementType = ref('')
const grouped = ref(false)
const inventory = computed(() => selectedReport.value === 'Inventario')
const movements = computed(() => selectedReport.value === 'Movimientos')
const loading = computed(() => inventory.value ? products.loading : movements.value ? operations.loading : wastes.loading)
const loadError = computed(() => inventory.value ? products.loadError : movements.value ? operations.loadError : wastes.loadError)
const dataReady = computed(() => !loading.value && !loadError.value)
const source = computed(() => movements.value ? operations.operations : wastes.wastes)
const query = computed(() => inventory.value ? { rows: [], unknownDates: 0, excludedDates: 0, dateFiltered: false, error: null } : queryRecords(source.value, { from: from.value, to: to.value, type: movements.value ? movementType.value : '' }))
const summary = computed(() => summarizeRecords(query.value.rows))
const groupRows = computed(() => groupRecordsByProduct(query.value.rows))
const exportRows = computed(() => inventory.value ? products.products : grouped.value ? groupRows.value : query.value.rows)
const dateNotice = computed(() => query.value.unknownDates ? t(query.value.dateFiltered ? 'partialDateResults' : 'unknownDateNotice', { count: query.value.unknownDates }) : '')
const loadedScopes = new Set()
const loadData = async () => {
  const scope = selectedReport.value
  try {
    if (scope === 'Inventario') await products.loadProducts()
    else if (scope === 'Movimientos') await operations.loadOperations()
    else await wastes.loadWastes()
    loadedScopes.add(scope)
  } catch { /* RequestState displays the error for the selected source. */ }
}
watch(selectedReport, scope => { if (!loadedScopes.has(scope)) loadData() }, { immediate: true })
const clearFilters = () => { from.value = ''; to.value = ''; movementType.value = ''; grouped.value = false }
const exportReport = () => {
  if (!dataReady.value || query.value.error || !exportRows.value.length) return
  const column = (key, value) => ({ header: t(key), value })
  let columns
  if (inventory.value) columns = [column('id', row => row.id), column('product', row => row.name), column('category', row => translateValue(row.category)), column('stock', row => row.stock), column('price', row => row.price), column('status', row => translateValue(row.status)), column('expirationDate', row => row.expirationDate)]
  else if (grouped.value) {
    columns = [column('productId', row => row.productId), column('product', row => row.productName), column('recordCount', row => row.count)]
    if (movements.value) columns.push(column('entryQuantity', row => row.invalidQuantities ? null : row.entries), column('exitQuantity', row => row.invalidQuantities ? null : row.exits))
    else columns.push(column('wasteQuantity', row => row.invalidQuantities ? null : row.wastes))
  } else columns = [column('id', row => row.id), column('productId', row => row.productId), column('product', row => row.productName), column(movements.value ? 'type' : 'reason', row => translateValue(movements.value ? row.type : row.reason)), column('quantity', row => row.quantity), column('date', row => row.date), column('dateReliability', row => t(parseRecordDate(row.date).date ? 'verifiedDate' : 'unverifiedDate'))]
  if (!inventory.value) {
    const scope = query.value.excludedDates ? t('csvPartialScope', { count: query.value.excludedDates }) : t('availableRecordsScope')
    columns.push(column('reportScope', () => scope))
    if (query.value.dateFiltered) columns.push(column('periodStart', () => from.value), column('periodEnd', () => to.value))
  }
  downloadCsv('bodego-' + selectedReport.value.toLowerCase() + (query.value.excludedDates ? '-parcial' : '') + '.csv', columns, exportRows.value)
}
</script>
<template>
  <AppLayout><div class="content">
    <PageHeader :title="t('reporting')" :description="t('reportsInteractiveHint')"><template #actions><Button class="cancel-btn" :disabled="loading" @click="loadData">{{ t('refreshData') }}</Button><Button id="export-csv" class="new-btn" :disabled="!dataReady || Boolean(query.error) || !exportRows.length" @click="exportReport">{{ t('exportCsv') }}</Button></template></PageHeader>
    <RequestState :loading="loading" :error="loadError" @retry="loadData" />
    <section class="panel report-filters">
      <div class="field"><label for="report-type">{{ t('reportType') }}</label><select id="report-type" v-model="selectedReport"><option value="Inventario">{{ t('inventory') }}</option><option value="Movimientos">{{ t('operations') }}</option><option value="Mermas">{{ t('waste') }}</option></select></div>
      <div class="field"><label for="report-from">{{ t('periodStart') }}</label><InputText id="report-from" v-model="from" type="date" :disabled="inventory" :aria-invalid="Boolean(query.error)" /></div>
      <div class="field"><label for="report-to">{{ t('periodEnd') }}</label><InputText id="report-to" v-model="to" type="date" :disabled="inventory" :aria-invalid="Boolean(query.error)" /></div>
      <div class="field"><label for="report-movement-type">{{ t('operationType') }}</label><select id="report-movement-type" v-model="movementType" :disabled="!movements"><option value="">{{ t('allMovementTypes') }}</option><option value="Entrada">{{ t('entry') }}</option><option value="Salida">{{ t('exit') }}</option></select></div>
      <div class="filter-actions"><label class="group-toggle" for="report-grouped"><Checkbox input-id="report-grouped" v-model="grouped" binary :disabled="inventory" />{{ t('groupByProduct') }}</label><Button severity="secondary" text @click="clearFilters">{{ t('clearFilters') }}</Button></div>
    </section>
    <template v-if="dataReady">
      <Message v-if="inventory" severity="info" :closable="false" class="report-notice">{{ t('inventorySnapshotNotice') }}</Message>
      <Message v-if="query.error" severity="error" :closable="false" class="report-notice">{{ t(query.error) }}</Message>
      <Message v-if="dateNotice" severity="warn" :closable="false" class="report-notice date-warning">{{ dateNotice }}</Message>
      <template v-if="!query.error">
        <div class="stats-grid report-stats" v-if="!inventory"><StatCard :label="t(query.excludedDates ? 'includedRecordCount' : 'recordCount')" :value="summary.count" icon="reports" /><StatCard :label="t('productsInResults')" :value="summary.products" icon="box" /><StatCard v-if="movements" :label="t('entryRecordCount')" :value="summary.entries" icon="movement" /><StatCard v-if="movements" :label="t('exitRecordCount')" :value="summary.exits" icon="movement" /></div>
        <p class="results-summary">{{ t(inventory ? 'inventorySnapshotNotice' : 'availableRecordsScope') }}</p>
        <div class="table-scroll" role="region" :aria-label="t('reporting')" tabindex="0"><table>
          <template v-if="inventory"><thead><tr><th>{{ t('id') }}</th><th>{{ t('product') }}</th><th>{{ t('category') }}</th><th>{{ t('stock') }}</th><th>{{ t('price') }}</th><th>{{ t('status') }}</th></tr></thead><tbody><tr v-for="product in products.products" :key="product.id"><td>{{ product.id }}</td><td><router-link :to="'/products/' + product.id">{{ product.name }}</router-link></td><td>{{ translateValue(product.category) }}</td><td>{{ product.stock }}</td><td>S/ {{ product.price }}</td><td>{{ translateValue(product.status) }}</td></tr><tr v-if="!products.products.length"><td colspan="6" class="empty">{{ t('noReportData') }}</td></tr></tbody></template>
          <template v-else-if="grouped"><thead><tr><th>{{ t('product') }}</th><th>{{ t('recordCount') }}</th><th>{{ t(movements ? 'entryQuantity' : 'wasteQuantity') }}</th><th v-if="movements">{{ t('exitQuantity') }}</th></tr></thead><tbody><tr v-for="row in groupRows" :key="row.productId"><td>{{ row.productName }}</td><td>{{ row.count }}</td><td>{{ row.invalidQuantities ? t('notAvailable') : movements ? row.entries : row.wastes }}</td><td v-if="movements">{{ row.invalidQuantities ? t('notAvailable') : row.exits }}</td></tr><tr v-if="!groupRows.length"><td :colspan="movements ? 4 : 3" class="empty">{{ t('noFilteredReportData') }}</td></tr></tbody></template>
          <template v-else><thead><tr><th>{{ t('id') }}</th><th>{{ t('product') }}</th><th>{{ t(movements ? 'type' : 'reason') }}</th><th>{{ t('quantity') }}</th><th>{{ t('date') }}</th></tr></thead><tbody><tr v-for="row in query.rows" :key="row.id"><td>{{ row.id }}</td><td>{{ row.productName }}</td><td>{{ translateValue(movements ? row.type : row.reason) }}</td><td>{{ row.quantity }}</td><td>{{ row.date || t('notAvailable') }}<small v-if="!parseRecordDate(row.date).date" class="cell-secondary unverified-date">{{ t('unverifiedDate') }}</small></td></tr><tr v-if="!query.rows.length"><td colspan="5" class="empty">{{ t('noFilteredReportData') }}</td></tr></tbody></template>
        </table></div>
      </template>
    </template>
  </div></AppLayout>
</template>

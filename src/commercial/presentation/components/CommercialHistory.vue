<script setup>
import '../real-commercial.css'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { t } from '../../../i18n.js'
import AppLayout from '../../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../../shared/presentation/components/PageHeader.vue'
import CommercialConnection from './CommercialConnection.vue'
import { useCommercialStore } from '../../application/real-commercial.js'
import { isTerminal, statusLabel } from '../../domain/backend-commercial.js'
import { formatMoney, formatDate, businessDate, commercialReference } from '../format.js'
import { useRecordLabels } from '../../../shared/presentation/utils/record-labels.js'
const props = defineProps({ kind: { type: String, required: true } })
const commercial = useCommercialStore(), router = useRouter()
const labels = useRecordLabels()
const search = ref(''), status = ref(''), from = ref(''), to = ref(''), connectionError = ref(null)
const base = computed(() => props.kind === 'purchase' ? '/purchases' : '/sales')
const invalidPeriod = computed(() => from.value && to.value && from.value > to.value)
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const documents = computed(() => props.kind === 'purchase' ? commercial.purchases : commercial.sales)
const pendingCount = computed(() => documents.value.filter(document => !isTerminal(document)).length)
const rows = computed(() => invalidPeriod.value ? [] : documents.value.filter(document => {
  const day = businessDate(document.createdAt)
  const matchesStatus = !status.value || (status.value === 'pending' ? !isTerminal(document) : document.status === status.value)
  return matchesStatus && (!from.value || day && day >= from.value) && (!to.value || day && day <= to.value) && normalize([commercialReference(props.kind, document.id), document.id, ...document.lines.map(line => line.productName)].join(' ')).includes(normalize(search.value))
}).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))))
const completedTotal = computed(() => rows.value.filter(document => document.status === 'Confirmed').reduce((sum, document) => sum + document.totalMinor, 0))
async function load() {
  connectionError.value = null
  try { await commercial.load(props.kind); await labels.loadRelated([]) } catch (error) { connectionError.value = error.message }
}
onMounted(load)
function clear() { search.value = ''; status.value = ''; from.value = ''; to.value = '' }
</script>
<template>
  <AppLayout>
    <div class="content commercial-page">
      <PageHeader :title="t(kind === 'purchase' ? 'commercialPurchases' : 'commercialSales')" :description="t('posHistoryHint')">
        <template #actions>
          <Button class="cancel-btn" :disabled="commercial.loading || commercial.submitting" @click="load">{{ t('refreshData') }}</Button>
          <Button class="new-btn" :disabled="commercial.submitting" @click="router.push(base + '/new')">{{ t(kind === 'purchase' ? 'commercialNewPurchase' : 'commercialNewSale') }}</Button>
        </template>
      </PageHeader>
      <p v-if="!commercial.loading && !commercial.loadError && !connectionError" class="results-summary">{{ t('completedCommercialTotal') }}: {{ formatMoney(completedTotal) }}</p>
      <CommercialConnection :loading="commercial.loading" :error="connectionError || commercial.loadError" @retry="load" />
      <div v-if="pendingCount && !commercial.loading && !commercial.loadError" class="review-warning pos-pending-banner" role="status">
        <p>{{ pendingCount }} borradores pendientes de confirmar.</p>
        <Button type="button" severity="secondary" outlined @click="status = 'pending'">Ver borradores</Button>
      </div>
      <section class="panel pos-history-filters">
        <div class="field">
          <label for="commercial-search">{{ t('commercialSearch') }}</label>
          <InputText id="commercial-search" v-model="search" type="search" :placeholder="t('posHistorySearchHint')" />
        </div>
        <details class="pos-filter-details">
          <summary>{{ t('posFilters') }}<span v-if="status || from || to"> &#183; {{ t('posFiltersActive') }}</span>
          </summary>
          <div class="pos-filter-fields">
            <div class="field">
              <label for="commercial-status">{{ t('status') }}</label>
              <select id="commercial-status" v-model="status">
                <option value="">{{ t('commercialAllStates') }}</option>
                <option value="pending">Borradores</option>
                <option v-for="value in ['Draft', 'Confirmed', 'Cancelled']" :key="value" :value="value">{{ statusLabel(value) }}</option>
              </select>
            </div>
            <div class="field">
              <label for="commercial-from">{{ t('periodStart') }}</label>
              <InputText id="commercial-from" v-model="from" type="date" />
            </div>
            <div class="field">
              <label for="commercial-to">{{ t('periodEnd') }}</label>
              <InputText id="commercial-to" v-model="to" type="date" />
            </div>
            <Button type="button" severity="secondary" text @click="clear">{{ t('clearFilters') }}</Button>
          </div>
        </details>
      </section>
      <p v-if="invalidPeriod" class="review-warning" role="alert">{{ t('invalidReportPeriod') }}</p>
      <template v-if="!commercial.loading && !commercial.loadError">
        <p class="results-summary">{{ t('resultsCount', { count: rows.length }) }}</p>
        <div class="table-scroll pos-history-table" tabindex="0" role="region" :aria-label="t('commercialHistory')">
          <table>
            <thead>
              <tr>
                <th>{{ t('posReference') }}</th>
                <th>{{ t('date') }}</th>
                <th>Responsable</th>
                <th>{{ t('commercialDistinctProducts') }}</th>
                <th>{{ t('commercialTotal') }}</th>
                <th>{{ t('status') }}</th>
                <th>{{ t('actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="document in rows" :key="document.id">
                <td>{{ commercialReference(kind, document.id) }}</td>
                <td>{{ formatDate(document.createdAt) }}</td>
                <td>{{ labels.responsible(document.userId) }}</td>
                <td>{{ document.lines.length }}</td>
                <td class="pos-history-total">{{ formatMoney(document.totalMinor) }}</td>
                <td>
                  <span class="status-pill" :class="{ 'status-danger': !isTerminal(document) }">{{ statusLabel(document.status) }}</span>
                </td>
                <td>
                  <router-link class="inline-action" :to="base + '/' + document.id">{{ t('posViewDetails') }}</router-link>
                </td>
              </tr>
              <tr v-if="!rows.length">
                <td colspan="7" class="empty">{{ t(documents.length ? 'commercialNoMatches' : 'commercialNoDocuments') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pos-history-mobile">
          <article v-for="document in rows" :key="document.id" class="panel pos-history-item">
            <div class="pos-history-item-heading">
              <strong>{{ commercialReference(kind, document.id) }}</strong>
              <strong class="pos-history-total">{{ formatMoney(document.totalMinor) }}</strong>
            </div>
            <p>{{ formatDate(document.createdAt) }} &#183; {{ t('posCartCount', { products: document.lines.length }) }}</p>
            <span class="status-pill" :class="{ 'status-danger': !isTerminal(document) }">{{ statusLabel(document.status) }}</span>
            <router-link class="inline-action" :to="base + '/' + document.id">{{ t('posViewDetails') }}</router-link>
          </article>
          <p v-if="!rows.length" class="panel empty">{{ t(documents.length ? 'commercialNoMatches' : 'commercialNoDocuments') }}</p>
        </div>
      </template>
    </div>
  </AppLayout>
</template>

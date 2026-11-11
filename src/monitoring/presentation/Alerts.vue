<script setup>
import { computed, ref, onMounted } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'
import { useAlertsStore } from '../application/alerts.js'
import { alertTypes, alertStatuses } from '../infrastructure/alerts.assembler.js'
const store = useAlertsStore()
const type = ref('')
const status = ref('')
const search = ref('')
const detailId = ref(null)
const rows = computed(() => store.alerts.filter(a => (!type.value || a.alertType === type.value) && (!status.value || a.status === status.value) && [a.id, a.productId, a.message].some(v => v.toLowerCase().includes(search.value.toLowerCase().trim()))))
const load = () => { detailId.value = null; store.detail = null; store.detailError = null; return store.loadAlerts() }
const detail = id => { detailId.value = id; return store.loadDetail(id) }
onMounted(load)
</script>
<template>
  <AppLayout><div class="content">
    <PageHeader title="Alertas" description="Alertas registradas en el backend. Consulta de solo lectura."><template #actions><Button class="cancel-btn" :disabled="store.loading || store.detailLoading" @click="load">Recargar</Button></template></PageHeader>
    <RequestState :loading="store.loading" :error="store.loadError" @retry="load" />
    <template v-if="!store.loading && !store.loadError">
      <section class="panel report-filters">
        <div class="field"><label for="alert-type">Tipo</label><select id="alert-type" v-model="type"><option value="">Todos los tipos</option><option v-for="(label, key) in alertTypes" :key="key" :value="key">{{ label }}</option></select></div>
        <div class="field"><label for="alert-status">Estado</label><select id="alert-status" v-model="status"><option value="">Todos los estados</option><option v-for="(label, key) in alertStatuses" :key="key" :value="key">{{ label }}</option></select></div>
        <div class="field"><label for="alert-search">Descripción o identificador</label><InputText id="alert-search" v-model="search" type="search" /></div>
      </section>
      <p class="results-summary" aria-live="polite">{{ rows.length }} alertas</p>
      <div v-if="rows.length" class="table-scroll" role="region" aria-label="Alertas" tabindex="0"><table><thead><tr><th>Tipo</th><th>Estado</th><th>Descripción</th><th>Producto (GUID)</th><th>Creación</th><th>Atención</th><th>Acciones</th></tr></thead><tbody>
        <tr v-for="alert in rows" :key="alert.id"><td><span class="status-pill">{{ alertTypes[alert.alertType] || alert.alertType }}</span></td><td>{{ alertStatuses[alert.status] || alert.status }}</td><td>{{ alert.message }}</td><td><router-link :to="'/products/' + alert.productId">{{ alert.productId }}</router-link></td><td>{{ alert.createdAt }}</td><td>{{ alert.attendedAt || 'Sin fecha de atención' }}</td><td><Button text :disabled="store.detailLoading" @click="detail(alert.id)">Ver detalle</Button></td></tr>
      </tbody></table></div>
      <p v-else class="panel empty" role="status">{{ store.alerts.length ? 'No hay alertas que coincidan con los filtros.' : 'No hay alertas registradas.' }}</p>
      <section v-if="detailId" class="panel" aria-label="Detalle de alerta">
        <h2>Detalle de alerta</h2><RequestState :loading="store.detailLoading" :error="store.detailError" @retry="detail(detailId)" />
        <dl v-if="store.detail && !store.detailLoading && !store.detailError">
          <dt>GUID</dt><dd>{{ store.detail.id }}</dd><dt>Descripción</dt><dd>{{ store.detail.message }}</dd>
          <dt>Tipo / Estado</dt><dd>{{ alertTypes[store.detail.alertType] || store.detail.alertType }} / {{ alertStatuses[store.detail.status] || store.detail.status }}</dd>
          <dt>Producto</dt><dd>{{ store.detail.productId }}</dd><dt>Lote</dt><dd>{{ store.detail.lotId || 'No disponible' }}</dd>
          <dt>Atendida por</dt><dd>{{ store.detail.attendedByUserId || 'No disponible' }}</dd>
          <dt>Creación</dt><dd>{{ store.detail.createdAt }}</dd><dt>Atención</dt><dd>{{ store.detail.attendedAt || 'Sin fecha de atención' }}</dd>
        </dl>
      </section>
    </template>
  </div></AppLayout>
</template>

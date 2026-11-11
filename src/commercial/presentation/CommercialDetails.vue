<script setup>
import './real-commercial.css'
import { useToast } from 'primevue/usetoast'
import { computed, watch, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { t } from '../../i18n.js'
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import CommercialConnection from './components/CommercialConnection.vue'
import { useCommercialStore } from '../application/real-commercial.js'
import { useAuthStore } from '../../iam/application/auth.js'
import { PERMISSIONS } from '../../iam/domain/permissions.js'
import { isTerminal, statusLabel } from '../domain/backend-commercial.js'
import { formatDate, formatMoney, commercialReference } from './format.js'
import { useRecordLabels } from '../../shared/presentation/utils/record-labels.js'
import RecordDetails from '../../shared/presentation/components/RecordDetails.vue'
const props = defineProps({ kind: { type: String, required: true } })
const route = useRoute(), router = useRouter(), commercial = useCommercialStore(), auth = useAuthStore()
const connectionError = ref(null)
const toast = useToast()
const labels = useRecordLabels(), showTechnical = ref(false)
const base = computed(() => props.kind === 'purchase' ? '/purchases' : '/sales')
const document = computed(() => (props.kind === 'purchase' ? commercial.purchases : commercial.sales).find(item => item.id === route.params.id))
const canConfirm = computed(() => auth.can(props.kind === 'purchase' ? PERMISSIONS.PURCHASES_CREATE : PERMISSIONS.SALES_CREATE))
async function load() {
  connectionError.value = null
  try { await commercial.load(props.kind, String(route.params.id)); await labels.loadRelated(document.value?.lines.map(l => l.productId) || []) } catch (error) { connectionError.value = error.message }
}
watch(() => [route.params.id, props.kind], load, { immediate: true })
async function confirmDocument() {
  if (commercial.submitting || commercial.writeBlocked || document.value?.status !== 'Draft') return
  try {
    await commercial.confirm(props.kind, document.value.id)
    toast.add({ severity: 'success', summary: 'Operación confirmada', detail: commercial.warning || 'La operación se confirmó y las existencias están actualizadas.', life: 8000 })
  } catch (error) { toast.add({ severity: 'error', summary: 'No se pudo confirmar', detail: error.message, life: 10000 }) }
}
</script>
<template>
  <AppLayout>
    <div class="content commercial-page">
      <PageHeader :title="t(kind === 'purchase' ? 'commercialPurchaseDetail' : 'commercialSaleDetail')" :description="'Consulta el borrador y confirma por separado para actualizar el stock.'">
        <template #actions>
          <Button class="cancel-btn" @click="router.push(base)">{{ t('commercialBack') }}</Button>
          <Button class="new-btn" :disabled="commercial.submitting" @click="router.push(base + '/new')">{{ t(kind === 'purchase' ? 'commercialNewPurchase' : 'commercialNewSale') }}</Button>
        </template>
      </PageHeader>
      <CommercialConnection :loading="commercial.loading" :error="connectionError || commercial.loadError" @retry="load" />
      <template v-if="document && !commercial.loading && !commercial.loadError">
        <p v-if="!isTerminal(document)" class="review-warning" role="alert">Borrador: las existencias cambiarán cuando confirmes la operación.</p>
        <section class="panel pos-document-summary">
          <div>
            <p class="pos-reference">{{ commercialReference(kind, document.id) }}</p>
            <span class="status-pill" :class="{ 'status-danger': !isTerminal(document) }">{{ statusLabel(document.status) }}</span>
            <p>{{ formatDate(document.createdAt) }}</p>
            <p>{{ t('commercialRegisteredBy') }}: {{ labels.responsible(document.userId) }}</p>
          </div>
          <div class="pos-document-total">
            <span>{{ t('commercialTotal') }}</span>
            <strong>{{ formatMoney(document.totalMinor) }}</strong>
            <p>{{ t('posCartCount', { products: document.lines.length }) }}</p>
          </div>
        </section>
        <section class="panel pos-document-lines" :aria-label="t('commercialLines')">
          <h2>{{ t('commercialLines') }}</h2>
          <div v-for="line in document.lines" :key="line.id" class="pos-document-line">
            <div>
              <router-link :to="'/products/' + line.productId">{{ line.productName }}</router-link>
              <p v-if="line.lotId">Lote: {{ labels.lot(line.lotId) }}</p><p v-else>{{ kind === 'purchase' ? 'El lote se asigna al confirmar' : 'Selección automática de lotes' }}</p><p>{{ line.quantity }} unidades &#215; {{ formatMoney(line.unitAmountMinor) }}</p>
            </div>
            <strong>{{ formatMoney(line.subtotalMinor) }}</strong>
          </div>
        </section>
        <p v-if="commercial.writeBlocked" class="review-warning" role="alert">{{ commercial.writeBlocked }}</p>
        <p v-if="commercial.warning" class="review-warning" role="status">{{ commercial.warning }}</p>
        <Button v-if="document.status === 'Draft' && canConfirm" :disabled="commercial.submitting || !!commercial.writeBlocked" :loading="commercial.submitting" @click="confirmDocument">Confirmar {{ kind === 'purchase' ? 'compra' : 'venta' }}</Button>
        <Button text @click="showTechnical = true">Ver datos del registro</Button>
        <RecordDetails v-model:visible="showTechnical" :fields="{ 'Identificador de la operación': document.id, 'Identificador del responsable': document.userId, 'Fecha original': document.registeredAt, ...Object.fromEntries(document.lines.map((line, index) => ['Detalle ' + (index + 1) + ' · producto / lote', line.productId + ' / ' + (line.lotId || 'Sin lote específico')])) }" />


      </template>
      <p v-else-if="!commercial.loading && !commercial.loadError" class="panel">{{ t('commercialNotFound') }}</p>
    </div>
  </AppLayout>
</template>

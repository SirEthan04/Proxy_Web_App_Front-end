<script setup>
import PendingEvidence from './components/PendingEvidence.vue'
import { computed, watch, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { t } from '../../i18n.js'
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import CommercialConnection from './components/CommercialConnection.vue'
import { connectionFeedback } from './connection-feedback.js'
import { useCommercialStore } from '../application/commercial.js'
import { useAuthStore } from '../../iam/application/auth.js'
import { PERMISSIONS } from '../../iam/domain/permissions.js'
import { isTerminal } from '../domain/commercial-status.js'
import { formatDate, formatMoney, commercialReference } from './format.js'
const props = defineProps({ kind: { type: String, required: true } })
const route = useRoute(), router = useRouter(), commercial = useCommercialStore(), auth = useAuthStore()
const connectionError = ref(null)
const evidenceOpen = ref(false)
const base = computed(() => props.kind === 'purchase' ? '/purchases' : '/sales')
const document = computed(() => (props.kind === 'purchase' ? commercial.purchases : commercial.sales).find(item => item.id === route.params.id))
const showTechnical = computed(() => auth.can(PERMISSIONS.REPORTS_READ))
async function load() {
  connectionError.value = null
  try { await commercial.load(props.kind) } catch (error) { connectionError.value = connectionFeedback(error) }
}
watch(() => [route.params.id, props.kind], load, { immediate: true })
</script>
<template>
  <AppLayout>
    <div class="content">
      <PageHeader :title="t(kind === 'purchase' ? 'commercialPurchaseDetail' : 'commercialSaleDetail')" :description="t('posReadOnly')">
        <template #actions>
          <Button class="cancel-btn" @click="router.push(base)">{{ t('commercialBack') }}</Button>
          <Button class="new-btn" :disabled="commercial.submitting" @click="router.push(base + '/new')">{{ t(kind === 'purchase' ? 'commercialNewPurchase' : 'commercialNewSale') }}</Button>
        </template>
      </PageHeader>
      <CommercialConnection :loading="commercial.loading" :error="connectionError || commercial.loadError" @retry="load" />
      <template v-if="document && !commercial.loading && !commercial.loadError">
        <p v-if="document.localOnly" class="review-warning" role="alert">{{ t('commercialLocalOnly') }}</p>
        <p v-if="!isTerminal(document)" class="review-warning" role="alert">{{ t('commercialPendingNotice') }}</p>
        <p v-else-if="document.status === 'failed'" class="review-warning">{{ t('commercialFailedNotice') }}</p>
        <section class="panel pos-document-summary">
          <div>
            <p class="pos-reference">{{ commercialReference(kind, document.id) }}</p>
            <span class="status-pill" :class="{ 'status-danger': !isTerminal(document) }">{{ t('commercialState_' + document.status) }}</span>
            <p>{{ formatDate(document.createdAt) }}</p>
            <p>{{ t('commercialRegisteredBy') }}: {{ document.registeredBy?.name }}</p>
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
              <p>{{ line.quantity }} &#215; {{ formatMoney(line.unitAmountMinor) }}</p>
            </div>
            <strong>{{ formatMoney(line.subtotalMinor) }}</strong>
          </div>
        </section>
        <details v-if="showTechnical && !isTerminal(document)" class="panel" @toggle="evidenceOpen = $event.target.open">
          <summary>{{ t('commercialUnderstandProblem') }}</summary>
          <PendingEvidence v-if="evidenceOpen" :key="kind + document.id" :kind="kind" :operation-id="document.id" />
        </details>

      </template>
      <p v-else-if="!commercial.loading && !commercial.loadError" class="panel">{{ t('commercialNotFound') }}</p>
    </div>
  </AppLayout>
</template>

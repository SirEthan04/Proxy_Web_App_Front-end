<script setup>
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import { loadReconciliation } from '../../application/reconciliation.js'
import { t } from '../../../i18n.js'
const props = defineProps({ kind: String, operationId: String })
const result = ref(null), loading = ref(false), error = ref(false)
const row = computed(() => result.value?.rows.find(r => r.kind === props.kind && r.id === props.operationId))
const value = item => item === null || item === undefined || item === '' ? t('reviewUnconfirmed') : item
async function load() {
  if (loading.value) return
  loading.value = true; error.value = false
  try { result.value = await loadReconciliation() } catch { error.value = true }
  finally { loading.value = false }
}
onMounted(load)
</script>
<template>
  <div>
    <p>{{ t('commercialPendingHelp') }}</p>
    <Button type="button" severity="secondary" text :disabled="loading" @click="load">{{ t('refreshData') }}</Button>
    <p v-if="loading" role="status">{{ t('loading') }}</p>
    <p v-else-if="error" role="alert">{{ t('reviewLoadFailed') }}</p>
    <template v-else-if="result">
      <p v-if="result.unavailable.length" class="review-warning">{{ t('reviewPartial') }} <span v-for="source in result.unavailable" :key="source">{{ t('reviewSource_' + source) }}. </span></p>
      <p v-if="row?.discrepancy" class="review-warning">{{ t('reviewDiscrepancy') }}</p>
      <p v-if="!row">{{ t('reviewUnconfirmed') }}</p>
      <section v-for="(snapshot, index) in row?.snapshots || []" :key="snapshot.source + index" class="review-snapshot">
        <p>{{ t('reviewOrigin') }}: {{ t('reviewSource_' + snapshot.source) }}</p>
        <div v-for="line in snapshot.lines" :key="line.id" class="review-line">
          <strong>{{ line.productName }}</strong>
          <dl class="review-facts">
            <div><dt>{{ t('quantity') }}</dt><dd>{{ value(line.quantity) }}</dd></div>
            <div><dt>{{ t('reviewStockBefore') }}</dt><dd>{{ value(line.stockBefore) }}</dd></div>
            <div><dt>{{ t('reviewStockExpected') }}</dt><dd>{{ value(line.stockAfter) }}</dd></div>
            <div><dt>{{ t('reviewStockCurrent') }}</dt><dd>{{ value(line.currentStock) }}</dd></div>
            <div><dt>{{ t('commercialMovement') }}</dt><dd>{{ t(line.movementConfirmed ? 'reviewMovementConfirmed' : 'reviewUnconfirmed') }}</dd></div>
          </dl>
          <p>{{ t(line.explanation) }}</p>
        </div>
      </section>
      <p>{{ t('reviewNoInference') }}</p>
      <details><summary>{{ t('reviewEvidenceDetails') }}</summary><p class="commercial-id">{{ operationId }}</p><p v-for="(snapshot, index) in row?.snapshots || []" :key="index">{{ t('reviewSource_' + snapshot.source) }}: {{ t('commercialState_' + snapshot.document.status) }}</p></details>
    </template>
  </div>
</template>

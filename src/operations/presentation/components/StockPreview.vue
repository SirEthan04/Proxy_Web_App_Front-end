<script setup>
import { t } from '../../../i18n.js'
const emptyValue = String.fromCharCode(8212)
defineProps({ preview: { type: Object, required: true }, selected: Boolean })
</script>
<template>
  <section class="stock-preview span-2" aria-live="polite">
    <p>{{ t('stockPreviewTitle') }}</p>
    <div v-if="selected" class="stock-preview-values"><span>{{ t('currentStock') }}<strong>{{ preview.stockBefore ?? emptyValue }}</strong></span><span aria-hidden="true">&#8594;</span><span>{{ t('estimatedStock') }}<strong>{{ preview.valid ? preview.stockAfter : emptyValue }}</strong></span></div>
    <small>{{ t(selected ? 'stockPreviewHint' : 'selectProductFirst') }}</small>
  </section>
</template>

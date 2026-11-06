<script setup>
import Button from 'primevue/button'
import { t } from '../../../i18n.js'
defineProps({ loading: Boolean, error: { type: String, default: null } })
defineEmits(['retry'])
</script>
<template>
  <p v-if="loading" class="loading-state" role="status">{{ t('posCheckingConnection') }}</p>
  <section v-else-if="error" class="request-error pos-connection-error" role="alert">
    <h2>{{ t('posConnectionTitle') }}</h2>
    <p>{{ t(error) }}</p>
    <Button id="pos-check-connection" type="button" severity="secondary" outlined @click="$emit('retry')">{{ t('posCheckConnection') }}</Button>
  </section>
</template>

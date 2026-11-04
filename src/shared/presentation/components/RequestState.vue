<script setup>
import Button from 'primevue/button'
import Message from 'primevue/message'
import { t } from '../../../i18n.js'
defineProps({ loading: Boolean, error: { type: [String, Boolean], default: null } })
defineEmits(['retry'])
</script>
<template>
  <p v-if="loading" class="loading-state" role="status"><span class="loading-dot" aria-hidden="true"></span>{{ t('loadingData') }}</p>
  <div v-else-if="error" class="request-error">
    <Message severity="error" :closable="false">{{ t(error) }}</Message>
    <Button severity="secondary" outlined @click="$emit('retry')">{{ t('retry') }}</Button>
  </div>
</template>

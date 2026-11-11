<script setup>
import Dialog from 'primevue/dialog'
defineProps({ visible: Boolean, title: { type: String, default: 'Detalles del registro' }, fields: { type: Object, default: () => ({}) } })
defineEmits(['update:visible'])
</script>
<template>
  <Dialog :visible="visible" modal :header="title" :style="{ width: '42rem', maxWidth: '94vw' }" :breakpoints="{ '640px': '94vw' }" @update:visible="$emit('update:visible', $event)">
    <dl class="record-detail-grid"><div v-for="(value, label) in fields" :key="label"><dt>{{ label }}</dt><dd>{{ value ?? 'No disponible' }}</dd></div></dl>
  </Dialog>
</template>

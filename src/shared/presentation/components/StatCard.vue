<script setup>
import NavIcon from './NavIcon.vue'
defineProps({ label: { type: String, required: true }, value: { type: [String, Number], required: true }, icon: { type: String, default: 'box' }, tone: { type: String, default: 'neutral' } })
</script>
<template>
  <article class="stat-card" :class="'stat-' + tone">
    <div class="stat-top">
      <p>{{ label }}</p>
      <span class="stat-icon">
        <NavIcon :name="icon" />
      </span>
    </div>
    <strong>{{ value }}</strong>
  </article>
</template>

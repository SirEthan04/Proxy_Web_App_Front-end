<script setup>
defineProps({ name: { type: String, default: 'box' } })
const paths = {
  home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  box: 'm3 7 9-4 9 4-9 4Zm0 0v10l9 4 9-4V7M12 11v10M7.5 5l9 4',
  movement: 'M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4',
  waste: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  alert: 'M12 3 2 21h20ZM12 9v5m0 3v1',
  reports: 'M4 3h12l4 4v14H4ZM8 16v-3m4 3V9m4 7v-5',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 4a4 4 0 0 1 0 8m6 9v-2a4 4 0 0 0-3-3M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  logout: 'M9 21H4V3h5m6 5 5 4-5 4M8 12h12',
  menu: 'M3 6h18M3 12h18M3 18h18',
  plus: 'M12 4v16M4 12h16',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  check: 'm5 12 4 4L19 6',
  edit: 'm15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z',
  search: 'M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  clock: 'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0'
}
</script>

<template>
  <svg
    class="nav-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="paths[name] || paths.box" />
  </svg>
</template>

<style scoped>
.nav-icon { width: 22px; height: 22px; flex: 0 0 auto; }
</style>

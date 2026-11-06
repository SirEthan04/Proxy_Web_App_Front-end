<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import Drawer from 'primevue/drawer'
import Sidebar from '../components/Sidebar.vue'
import Header from '../components/Header.vue'
import { t } from '../../../i18n.js'

const route = useRoute()
const media = window.matchMedia('(max-width: 1023px)')
const isCompact = ref(media.matches)
const menuOpen = ref(false)
const restoreMenuFocus = () => document.querySelector('.menu-button')?.focus()
const updateViewport = event => { isCompact.value = event.matches; menuOpen.value = false }
onMounted(() => media.addEventListener('change', updateViewport))
onBeforeUnmount(() => media.removeEventListener('change', updateViewport))
watch(() => route.fullPath, () => { menuOpen.value = false })
</script>

<template>
  <div class="app-layout">
    <a class="skip-link" href="#main-content">{{ t('skipToContent') }}</a>
    <Sidebar v-if="!isCompact" class="desktop-sidebar" />
    <Drawer v-if="isCompact" id="bodego-navigation" v-model:visible="menuOpen" :header="t('navigation')" class="navigation-drawer" :block-scroll="true" @after-hide="restoreMenuFocus" :close-button-props="{ 'aria-label': t('closeNavigation'), severity: 'secondary', text: true }">
      <Sidebar @navigate="menuOpen = false" />
    </Drawer>
    <div class="app-workspace">
      <Header :compact="isCompact" :menu-open="menuOpen" @toggle-menu="menuOpen = !menuOpen" />
      <main id="main-content" class="app-content" tabindex="-1"><slot /></main>
      <footer class="app-footer">BodeGo <span aria-hidden="true">&#183;</span> {{ t('inventoryMadeSimple') }}</footer>
    </div>
  </div>
</template>

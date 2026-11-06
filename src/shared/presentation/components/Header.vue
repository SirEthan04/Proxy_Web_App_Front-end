<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'
import { t, translateValue } from '../../../i18n.js'
import { useAuthStore } from '../../../iam/application/auth.js'
import LanguageSwitcher from './language-switcher.vue'
import NavIcon from './NavIcon.vue'
defineProps({ compact: Boolean, menuOpen: Boolean })
defineEmits(['toggle-menu'])
const authStore = useAuthStore()
const initials = computed(() => (authStore.user?.name || t('user')).split(' ').filter(Boolean).slice(0, 2).map(name => name[0]).join(''))
</script>
<template>
  <header class="app-header">
    <div class="header-start">
      <Button
        v-if="compact"
        class="menu-button"
        severity="secondary"
        text
        :aria-label="t('openNavigation')"
        :aria-expanded="menuOpen"
        aria-controls="bodego-navigation"
        @click="$emit('toggle-menu')"
      >
        <NavIcon name="menu" />
      </Button>
      <span class="workspace-label">{{ t('workspace') }}</span>
    </div>
    <div class="header-end">
      <LanguageSwitcher />
      <div class="user">
        <div class="user-copy">
          <strong>{{ authStore.user?.name || t('user') }}</strong>
          <span>{{ translateValue(authStore.user?.role) || t('noRole') }}</span>
        </div>
        <span class="avatar" aria-hidden="true">{{ initials }}</span>
      </div>
    </div>
  </header>
</template>

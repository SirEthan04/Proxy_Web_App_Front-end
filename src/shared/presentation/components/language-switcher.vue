<script setup>
import Button from 'primevue/button'
import { computed } from 'vue'
import { useI18n } from '../../../i18n.js'

const { language, setLocale, t } = useI18n()
const nextLanguage = computed(() => language.value === 'en' ? 'es' : 'en')
const nextLanguageLabel = computed(() => nextLanguage.value === 'es' ? 'Español' : 'English')

const toggleLanguage = () => setLocale(nextLanguage.value)
</script>

<template>
  <Button
    severity="secondary"
    outlined
    type="button"
    class="language-switcher"
    :aria-label="`${t('language')}: ${nextLanguageLabel}`"
    @click="toggleLanguage"
  >
    <span>{{ t('language') }}:</span>
    <span :lang="nextLanguage">{{ nextLanguageLabel }}</span>
  </Button>
</template>

<style scoped>
.language-switcher { display: inline-flex; align-items: center; gap: 6px; padding: 9px 12px; border: 1px solid #dce4e7; background: white; color: #53656e; font-size: 13px; white-space: nowrap; min-height: 44px; }
.language-switcher:hover { background: #f5f8f6; }
</style>

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
.language-switcher {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
  color: #0f2942;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.language-switcher:hover {
  background: #f1f5f9;
  border-color: #168cff;
}

.language-switcher:focus-visible {
  outline: 2px solid #168cff;
  outline-offset: 3px;
}
</style>

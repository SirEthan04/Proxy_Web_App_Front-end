import { computed, ref, watch } from 'vue'
import es from './locales/es.json'
import en from './locales/en.json'

export const messages = { es, en }
export const supportedLocales = Object.freeze(['es', 'en'])
export const fallbackLocale = 'es'
const storageKey = 'bodego-language'

function savedLocale() {
  try {
    const saved = globalThis.localStorage?.getItem(storageKey)
    return supportedLocales.includes(saved) ? saved : fallbackLocale
  } catch {
    return fallbackLocale
  }
}

export const locale = ref(savedLocale())

export function setLocale(value) {
  if (!supportedLocales.includes(value)) return false
  locale.value = value
  return true
}

export const language = computed({
  get: () => locale.value,
  set: setLocale,
})

export function t(key, params = {}) {
  const translation = messages[locale.value]?.[key] ?? messages[fallbackLocale][key] ?? key
  return translation.replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match)
}

const valueKeys = new Map(Object.entries(es).map(([key, value]) => [value, key]))

// Translate stored labels without changing the values used by the API and filters.
export function translateValue(value) {
  const key = valueKeys.get(value)
  return key ? t(key) : value
}

watch(locale, value => {
  if (!supportedLocales.includes(value)) {
    locale.value = fallbackLocale
    return
  }
  if (typeof document !== 'undefined') document.documentElement.lang = value
  try {
    globalThis.localStorage?.setItem(storageKey, value)
  } catch {
  }
}, { immediate: true, flush: 'sync' })

export function useI18n() {
  return { t, locale: language, language, setLocale, supportedLocales }
}

export default {
  install(app) {
    app.config.globalProperties.$t = t
    app.provide('i18n', useI18n())
  },
}

<script setup>
import NavIcon from '../../shared/presentation/components/NavIcon.vue'
import LanguageSwitcher from '../../shared/presentation/components/language-switcher.vue'

import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { t } from '../../i18n.js'
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '../application/auth.js'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()
const email = ref('')
const password = ref('')
const submitting = ref(false)
const showError = key => toast.add({ severity: 'error', summary: t('errorTitle'), detail: t(key), life: 8000 })
onMounted(() => { if (authStore.error) showError(authStore.error) })
const login = async () => {
  if (submitting.value) return
  if (!email.value || !password.value) { showError('requiredFields'); return }
  submitting.value = true
  try {
    if (!authStore.login(email.value, password.value)) { showError(authStore.error); return }
    password.value = ''
    const destination = route.query.redirect
    let target = '/dashboard'
    if (typeof destination === 'string' && destination.startsWith('/') && !destination.startsWith('//')) {
      const resolved = router.resolve(destination)
      if (resolved.matched.length && resolved.meta.requiresAuth) target = resolved.fullPath
    }
    await router.replace(target)
  } finally { submitting.value = false }
}
</script>
<template>
  <div class="login-page">
    <aside class="login-brand">
      <div class="brand"><span class="brand-mark"><NavIcon name="box" /></span><span>Bode<span class="brand-go">Go</span><small>{{ t('yourStoreOrganized') }}</small></span></div>
      <div class="login-intro"><p class="login-eyebrow">{{ t('inventoryMadeSimple') }}</p><h1>{{ t('loginHeadline') }}</h1><p>{{ t('loginDescription') }}</p>
        <ul class="login-benefits"><li><NavIcon name="check" />{{ t('loginBenefitProducts') }}</li><li><NavIcon name="check" />{{ t('loginBenefitMovements') }}</li><li><NavIcon name="check" />{{ t('loginBenefitAlerts') }}</li></ul>
      </div>
      <p class="login-brand-footer">{{ t('builtForYourDay') }}</p>
    </aside>
    <main class="login-main">
      <div class="login-language"><LanguageSwitcher /></div>
      <form class="login-box" @submit.prevent="login">
        <div class="login-heading"><span class="login-icon"><NavIcon name="home" /></span><h2>{{ t('login') }}</h2><p>{{ t('loginSubtitle') }}</p></div>
        <div class="field"><label for="login-email">{{ t('email') }}</label><InputText id="login-email" v-model="email" type="email" autocomplete="username" :placeholder="t('emailPlaceholder')" aria-required="true" :disabled="submitting" /></div>
        <div class="field"><label for="login-password">{{ t('password') }}</label><InputText id="login-password" v-model="password" type="password" autocomplete="current-password" placeholder="********" aria-required="true" :disabled="submitting" /></div>
        <Button class="login-submit" type="submit" :disabled="submitting" :loading="submitting">{{ t('loginSubmit') }}<NavIcon name="arrow" /></Button>
        <p class="demo-note">{{ t('demoAuthNotice') }}</p>
      </form>
      <p class="login-footer">BodeGo <span aria-hidden="true">&#183;</span> {{ t('inventoryMadeSimple') }}</p>
    </main>
  </div>
</template>
<style scoped>
.login-page { min-height: 100vh; display: grid; grid-template-columns: minmax(330px, .8fr) minmax(0, 1.2fr); }
.login-brand { background: var(--b-sidebar); color: white; padding: 48px; display: flex; flex-direction: column; }
.login-brand .brand { margin: 0; }
.login-intro { margin: auto 0; padding: 60px 0; max-width: 430px; }
.login-eyebrow { color: #a9d4bf; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; }
.login-intro h1 { font-size: clamp(32px, 3.5vw, 48px); max-width: 350px; letter-spacing: -1.5px; line-height: 1.2; margin-bottom: 24px; }
.login-intro > p:not(.login-eyebrow) { color: #c4d1d8; font-size: 16px; max-width: 360px; }
.login-benefits { list-style: none; padding: 16px 0 0; margin: 0; display: grid; gap: 18px; color: #e5eef0; font-size: 14px; }
.login-benefits li { display: flex; align-items: center; gap: 12px; }
.login-benefits svg { color: #91c8ab; width: 19px; }
.login-brand-footer { font-size: 12px; color: #a9bec8; margin: 0; }
.login-main { padding: 36px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
.login-language { position: absolute; right: 32px; top: 24px; }
.login-box { background: white; border: 1px solid var(--b-border); border-radius: 14px; padding: 38px; width: 100%; max-width: 440px; margin: 68px 0 24px; display: grid; gap: 22px; }
.login-heading { text-align: left; }
.login-heading h2 { font-size: 26px; margin-bottom: 8px; letter-spacing: -.7px; }
.login-heading p { color: var(--b-muted); font-size: 14px; margin-bottom: 0; }
.login-icon { display: inline-flex; padding: 10px; background: #edf5ef; color: #3a7655; border-radius: 10px; margin-bottom: 20px; }
.demo-note { font-size: 12px; color: var(--b-muted); text-align: center; margin: 0; line-height: 1.6; }
.login-footer { color: var(--b-muted); font-size: 12px; text-align: center; }
.login-footer span { padding: 0 5px; }
@media (max-width: 1023px) { .login-brand { padding: 32px; } .login-intro { padding-block: 40px; } .login-main { padding: 24px; } .login-box { padding: 28px; } }
@media (max-width: 767px) {
  .login-page { display: flex; flex-direction: column; }
  .login-brand { padding: 24px; }
  .login-brand .brand { font-size: 24px; }
  .login-intro { padding: 26px 0 0; max-width: 100%; }
  .login-intro h1 { max-width: none; font-size: 28px; margin-bottom: 10px; }
  .login-intro > p:not(.login-eyebrow) { margin-bottom: 0; font-size: 14px; max-width: 100%; }
  .login-eyebrow, .login-benefits, .login-brand-footer { display: none; }
  .login-main { padding: 20px 16px; }
  .login-language { position: static; align-self: flex-end; margin-bottom: 16px; }
  .login-box { margin: 0 0 20px; padding: 26px 22px; }
  .login-icon { display: none; }
}
</style>

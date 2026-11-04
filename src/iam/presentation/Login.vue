<script setup>
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

    <div class="left-side">
      <div class="brand">
        <h1>BodeGo</h1>
        <p>{{ t('brandTagline') }}</p>
      </div>
    </div>

    <div class="right-side">

      <form class="login-box" @submit.prevent="login">

        <h2>{{ t('login') }}</h2>
        <p>{{ t('loginSubtitle') }}</p>

        <label>{{ t('email') }}</label>
        <InputText
            v-model="email"
            type="email"
            :placeholder="t('emailPlaceholder')" />

        <label>{{ t('password') }}</label>
        <InputText
            v-model="password"
            type="password"
            placeholder="********" />

        <p>{{ t('demoAuthNotice') }}</p>
        <Button type="submit" :disabled="submitting" :loading="submitting">
          {{ t('loginSubmit') }}
        </Button>

      </form>

    </div>

  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 40% 60%;
}

.left-side {
  background: #0f2942;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand {
  text-align: center;
}

.brand h1 {
  font-size: 55px;
  margin-bottom: 10px;
}

.brand p {
  font-size: 18px;
  color: #cbd5e1;
}

.right-side {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}

.login-box {
  width: 380px;
}

.login-box h2 {
  font-size: 30px;
  margin-bottom: 5px;
}

.login-box p {
  color: #64748b;
  margin-bottom: 25px;
}

.login-box label {
  display: block;
  margin-bottom: 7px;
}

.login-box input {
  width: 100%;
  padding: 12px;
  margin-bottom: 18px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
}

.login-box button {
  width: 100%;
  padding: 13px;
  border: none;
  border-radius: 6px;
  background: #168cff;
  color: white;
  cursor: pointer;
}

.login-box button:hover {
  background: #0f78d1;
}
</style>



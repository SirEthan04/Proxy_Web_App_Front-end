import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import { createApp, watch } from 'vue'
import { session } from './iam/infrastructure/session.js'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'

import App from './App.vue'
import router from './routes'
import i18n from './i18n.js'

import './style.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(ToastService)
app.use(ConfirmationService)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: false,
      cssLayer: { name: 'primevue', order: 'primevue' },
    },
  },
})
app.use(router)
watch(() => session.accessToken, (token, previous) => {
  if (!token && previous && router.currentRoute.value.meta.requiresAuth) {
    router.replace({ path: '/login', query: { expired: '1', redirect: router.currentRoute.value.fullPath } })
  }
})
app.use(i18n)

app.mount('#app')

import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import { useAuthStore } from './iam/application/auth.js'

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
useAuthStore(pinia).loadUser()
app.use(router)
app.use(i18n)

app.mount('#app')

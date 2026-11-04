<script setup>
import Button from 'primevue/button'
import { t } from '../../../i18n.js'

import { useRouter } from 'vue-router'
import { computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useProductsStore } from '../../../inventory/application/products.js'
import { useUsersStore } from '../../../iam/application/users.js'
import { useOperationsStore } from '../../../operations/application/operations.js'
import { useWasteStore } from '../../../operations/application/waste.js'
import { useAuthStore } from '../../../iam/application/auth.js'

const router = useRouter()
const authStore = useAuthStore()

const toast = useToast()
const stores = [useProductsStore(), useUsersStore(), useOperationsStore(), useWasteStore()]
const busy = computed(() => stores.some(store => store.saving || store.submitting))
const logout = () => {
  if (busy.value) return
  authStore.logout()
  for (const store of stores) store.clearSessionData()
  if (authStore.error) toast.add({ severity: 'error', summary: t('errorTitle'), detail: t(authStore.error), life: 8000 })
  router.replace('/login')
}
</script>

<template>
  <aside class="sidebar">

    <div class="logo">
      BodeGo
    </div>

    <nav>
      <router-link to="/dashboard">
        {{ t('dashboard') }}
      </router-link>

      <router-link to="/products">
        {{ t('inventory') }}
      </router-link>

      <router-link to="/operations">
        {{ t('operations') }}
      </router-link>

      <router-link to="/alerts">
        {{ t('monitoring') }}
      </router-link>

      <router-link to="/reports">
        {{ t('reporting') }}
      </router-link>

      <router-link to="/waste">
        {{ t('waste') }}
      </router-link>
      <router-link to="/users">
        {{ t('users') }}
      </router-link>
    </nav>

    <Button
        class="logout" :disabled="busy"
        @click="logout"
    >
      {{ t('logout') }}
    </Button>

  </aside>
</template>

<style scoped>
.sidebar {
  width: 220px;
  min-height: 100vh;
  background: #0f2942;
  color: white;
  padding: 20px;

  display: flex;
  flex-direction: column;
}

.logo {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 30px;
}

nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

nav a {
  color: #dbe5ef;
  text-decoration: none;
  padding: 10px;
  border-radius: 6px;
}

nav a:hover {
  background: #1a3c5a;
}

.router-link-active {
  background: #168cff;
  color: white;
}

.logout {
  margin-top: auto;
  background: transparent;
  border: none;
  color: #dbe5ef;
  padding: 10px;
  text-align: left;
  cursor: pointer;
}

.logout:hover {
  color: white;
}
</style>
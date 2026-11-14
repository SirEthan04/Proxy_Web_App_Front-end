<script setup>
import { useCommercialStore } from '../../../commercial/application/real-commercial.js'
import NavIcon from './NavIcon.vue'

import { PERMISSIONS } from '../../../iam/domain/permissions.js'
import Button from 'primevue/button'
import { t } from '../../../i18n.js'

import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useProductsStore } from '../../../inventory/application/inventory.js'
import { useUsersStore } from '../../../iam/application/users.js'
import { useRealOperationsStore } from '../../../operations/application/real-operations.js'
import { useAuthStore } from '../../../iam/application/auth.js'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const toast = useToast()
const stores = [useCommercialStore(), useProductsStore(), useUsersStore(), useRealOperationsStore()]
const busy = computed(() => stores.some(store => store.saving || store.submitting))
const logout = () => {
  if (busy.value) return
  authStore.logout()
  for (const store of stores) store.$reset()
  if (authStore.error) toast.add({ severity: 'error', summary: t('errorTitle'), detail: t(authStore.error), life: 8000 })
  router.replace('/login')
}

const emit = defineEmits(['navigate'])
const navigationGroups = computed(() => [
  { label: 'navOverview', items: [
    { to: '/dashboard', label: 'dashboard', icon: 'home', permission: PERMISSIONS.DASHBOARD_READ }
  ] },
  { label: 'navDailyTasks', items: [
    { to: '/purchases', label: 'commercialPurchases', icon: 'purchase', permission: PERMISSIONS.PURCHASES_READ },
    { to: '/sales', label: 'commercialSales', icon: 'sale', permission: PERMISSIONS.SALES_READ },
  ] },
  { label: 'navMerchandise', items: [
    { to: '/products', label: 'products', icon: 'box', permission: PERMISSIONS.PRODUCTS_READ },
    { to: '/operations', label: 'entriesAndExits', icon: 'movement', permission: PERMISSIONS.OPERATIONS_WRITE },
    { to: '/waste', label: 'waste', icon: 'waste', permission: PERMISSIONS.WASTE_WRITE },

  ] },
  { label: 'navAdministration', items: [
    { to: '/alerts', label: 'alerts', icon: 'alert', permission: PERMISSIONS.ALERTS_READ },
    { to: '/reports', label: 'reporting', icon: 'reports', permission: PERMISSIONS.REPORTS_READ },
    { to: '/users', label: 'users', icon: 'users', permission: PERMISSIONS.USERS_READ }
  ] }
].map(group => ({ ...group, items: group.items.filter(item => authStore.can(item.permission)) })).filter(group => group.items.length))
</script>
<template>
  <aside class="sidebar">
    <router-link class="brand" to="/dashboard" @click="emit('navigate')"><span class="brand-mark"><NavIcon name="box" /></span><span>Bode<span class="brand-go">Go</span><small>{{ t('yourStoreOrganized') }}</small></span></router-link>
    <nav :aria-label="t('navigation')">
      <div v-for="group in navigationGroups" :key="group.label" class="nav-group">
        <p class="nav-group-label">{{ t(group.label) }}</p>
        <router-link v-for="item in group.items" :key="item.to" :to="item.to" :class="{ 'nav-item-active': route.path === item.to || route.path.startsWith(item.to + '/') }" @click="emit('navigate')"><NavIcon :name="item.icon" /><span>{{ t(item.label) }}</span></router-link>
      </div>
    </nav>
    <div class="sidebar-bottom"><p>Tu bodega, organizada</p><Button class="logout" :disabled="busy" @click="logout"><NavIcon name="logout" />{{ t('logout') }}</Button></div>
  </aside>
</template>

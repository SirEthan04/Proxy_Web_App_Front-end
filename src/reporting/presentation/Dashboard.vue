<script setup>
import { computed, onMounted } from 'vue'
import Button from 'primevue/button'
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import StatCard from '../../shared/presentation/components/StatCard.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'
import NavIcon from '../../shared/presentation/components/NavIcon.vue'
import { t } from '../../i18n.js'
import { useAuthStore } from '../../iam/application/auth.js'
import { PERMISSIONS } from '../../iam/domain/permissions.js'
import { useAlertsStore } from '../../monitoring/application/alerts.js'
import { useReportsStore } from '../application/reports.js'
const auth = useAuthStore()
const isAdministrative = computed(() => auth.can(PERMISSIONS.REPORTS_READ))
const alerts = useAlertsStore()
const reports = useReportsStore()
const load = () => Promise.allSettled([alerts.loadAlerts(), ...(isAdministrative.value ? [reports.loadReports()] : [])])
onMounted(load)
const quickActions = computed(() => [
  { to: '/sales/new', label: 'commercialNewSale', icon: 'sale', permission: PERMISSIONS.SALES_CREATE },
  { to: '/purchases/new', label: 'commercialNewPurchase', icon: 'purchase', permission: PERMISSIONS.PURCHASES_CREATE },
  { to: '/products', label: 'consultProducts', icon: 'box', permission: PERMISSIONS.PRODUCTS_READ },
  { to: '/waste', label: 'registerWaste', icon: 'waste', permission: PERMISSIONS.WASTE_WRITE },
  { to: '/reports', label: 'reporting', icon: 'reports', permission: PERMISSIONS.REPORTS_READ },
  { to: '/users', label: 'users', icon: 'users', permission: PERMISSIONS.USERS_READ }
].filter(action => auth.can(action.permission)))
</script>
<template>
  <AppLayout><div class="content">
    <PageHeader :title="t(isAdministrative ? 'storeOverview' : 'dailyWorkspace')" description="Información real del backend. Ventas confirmadas de todo el periodo."><template #actions><Button class="cancel-btn" :disabled="alerts.loading || reports.loading" @click="load">Recargar</Button></template></PageHeader>
    <section v-if="isAdministrative">
      <RequestState :loading="reports.loading" :error="reports.loadError" @retry="reports.loadReports()" />
      <div v-if="!reports.loading && !reports.loadError && reports.summary" class="stats-grid">
        <StatCard label="Ventas confirmadas" :value="reports.summary.salesCount" icon="reports" />
        <StatCard label="Importe total de ventas" :value="'S/ ' + reports.summary.totalAmount.toFixed(2)" icon="sale" />
      </div>
    </section>
    <RequestState :loading="alerts.loading" :error="alerts.loadError" @retry="alerts.loadAlerts()" />
    <div v-if="!alerts.loading && !alerts.loadError" class="stats-grid">
      <StatCard label="Alertas registradas" :value="alerts.alerts.length" icon="alert" />
      <StatCard label="Alertas pendientes" :value="alerts.alerts.filter(a => a.status === 'Pending').length" icon="alert" tone="warning" />
      <StatCard label="Alertas atendidas" :value="alerts.alerts.filter(a => a.status === 'Attended').length" icon="clock" />
    </div>
    <section class="panel quick-panel">
      <div class="section-heading"><div><h2>{{ t('quickActions') }}</h2><p>{{ t('quickActionsHint') }}</p></div></div>
      <div class="quick-actions"><router-link v-for="action in quickActions" :key="action.to" :to="action.to" class="quick-action"><NavIcon :name="action.icon" /><span>{{ t(action.label) }}</span></router-link></div>
    </section>
    <section class="panel"><div class="section-heading"><h2>Alertas registradas</h2><router-link class="section-link" to="/alerts">Ver todas</router-link></div>
      <template v-if="!alerts.loading && !alerts.loadError"><p v-for="alert in alerts.alerts.slice(0, 5)" :key="alert.id">{{ alert.message }} <small>{{ alert.createdAt }}</small></p><p v-if="!alerts.alerts.length" role="status">No hay alertas registradas.</p></template>
    </section>
    <p class="panel">Métricas de movimientos, mermas y vencimientos de lotes: no disponibles en los cuatro endpoints integrados. Consulta Inventario para ver el catálogo real.</p>
  </div></AppLayout>
</template>

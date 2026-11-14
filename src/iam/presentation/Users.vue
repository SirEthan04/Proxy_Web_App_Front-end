<script setup>
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'

import Button from 'primevue/button'
import { t, translateValue } from '../../i18n.js'

import { computed, onMounted } from 'vue'

import { useUsersStore } from '../application/users.js'

const usersStore = useUsersStore()
const legacyDisabled = import.meta.env.PROD

const loading = computed(() => usersStore.loading)
const loadError = computed(() => usersStore.loadError)
const dataReady = computed(() => !loading.value && !loadError.value)
const loadData = async () => {
  if (legacyDisabled) return
  await Promise.allSettled([usersStore.loadUsers()])
}
onMounted(loadData)
</script>

<template>
  <AppLayout>
    <div class="content">
      <PageHeader :title="t('users')" :description="t('usersSubtitle')" />
      <p v-if="legacyDisabled" role="status">La administración de usuarios legacy no está disponible en producción. Su integración con la API BodeGo está pendiente.</p>
      <RequestState v-else :loading="loading" :error="loadError" @retry="loadData" />
      <p class="table-hint">{{ t('tableScrollHint') }}</p>
      <div class="table-scroll" role="region" :aria-label="t('tableScrollHint')" tabindex="0">
        <table v-if="dataReady && !legacyDisabled">
          <thead>
            <tr>
              <th>{{ t('id') }}</th>
              <th>{{ t('name') }}</th>
              <th>{{ t('email') }}</th>
              <th>{{ t('role') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in usersStore.users" :key="user.id">
              <td>{{ user.id }}</td>
              <td>{{ user.name }}</td>
              <td>{{ user.email }}</td>
              <td>
                <span class="status-pill">{{ translateValue(user.role) }}</span>
              </td>
            </tr>
            <tr v-if="usersStore.users.length === 0">
              <td colspan="4" class="empty">
                {{ t('noUsers') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AppLayout>
</template>

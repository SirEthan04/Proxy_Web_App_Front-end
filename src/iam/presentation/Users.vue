<script setup>
import { t, translateValue } from '../../i18n.js'

import { onMounted } from 'vue'

import Sidebar from '../../shared/presentation/components/Sidebar.vue'
import Header from '../../shared/presentation/components/Header.vue'
import { useUsersStore } from '../application/users.js'

const usersStore = useUsersStore()

onMounted(async () => {
  await usersStore.loadUsers()
})
</script>

<template>
  <div class="page">
    <Sidebar />

    <main class="main-content">
      <Header />

      <div class="content">
        <h1>{{ t('users') }}</h1>
        <p>{{ t('usersSubtitle') }}</p>

        <table>
          <thead>
          <tr>
            <th>{{ t('id') }}</th>
            <th>{{ t('name') }}</th>
            <th>{{ t('email') }}</th>
            <th>{{ t('role') }}</th>
          </tr>
          </thead>

          <tbody>
          <tr
              v-for="user in usersStore.users"
              :key="user.id"
          >
            <td>{{ user.id }}</td>
            <td>{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>{{ translateValue(user.role) }}</td>
          </tr>

          <tr v-if="usersStore.users.length === 0">
            <td colspan="4" class="empty">
              {{ t('noUsers') }}
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page {
  display: flex;
}

.main-content {
  flex: 1;
}

.content {
  padding: 30px;
}

table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  margin-top: 20px;
}

th,
td {
  padding: 12px;
  border-bottom: 1px solid #ddd;
  text-align: left;
}

th {
  background-color: #f3f4f6;
}

.empty {
  text-align: center;
  padding: 20px;
}
</style>
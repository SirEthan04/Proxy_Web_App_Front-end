<script setup>
import { t, translateValue } from '../../../i18n.js'

import { useAuthStore } from '../../../iam/application/auth.js'
import LanguageSwitcher from './language-switcher.vue'

const authStore = useAuthStore()
</script>

<template>
  <header class="header">

    <LanguageSwitcher />

    <div class="user">
      <div>
        <strong>
          {{ authStore.user?.name || t('user') }}
        </strong>

        <span>
          {{ translateValue(authStore.user?.role) || t('noRole') }}
        </span>
      </div>

      <div class="avatar">
        JP
      </div>
    </div>

  </header>
</template>

<style scoped>
.header {
  height: 70px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
}

.user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user div:first-child {
  display: flex;
  flex-direction: column;
  text-align: right;
}

.user span {
  font-size: 12px;
  color: #64748b;
}

.avatar {
  width: 40px;
  height: 40px;
  background: #168cff;
  color: white;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>

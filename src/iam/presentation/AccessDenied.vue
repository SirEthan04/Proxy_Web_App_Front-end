<script setup>
import Button from 'primevue/button'
import { useRouter } from 'vue-router'
import { t } from '../../i18n.js'
import Sidebar from '../../shared/presentation/components/Sidebar.vue'
import Header from '../../shared/presentation/components/Header.vue'
const router = useRouter()
</script>

<template>
  <div class="page">
    <Sidebar />
    <main>
      <Header />
      <section role="alert">
        <h1>{{ t('accessDeniedTitle') }}</h1>
        <p>{{ t('accessDeniedMessage') }}</p>
        <Button @click="router.replace('/dashboard')">{{ t('backToDashboard') }}</Button>
      </section>
    </main>
  </div>
</template>

<style scoped>
.page { display: flex; }
main { flex: 1; min-width: 0; }
section { padding: 30px; }
</style>

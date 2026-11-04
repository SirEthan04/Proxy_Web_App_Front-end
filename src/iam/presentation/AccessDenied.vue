<script setup>
import Button from 'primevue/button'
import { useRouter } from 'vue-router'
import { t } from '../../i18n.js'
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import RequestState from '../../shared/presentation/components/RequestState.vue'
import NavIcon from '../../shared/presentation/components/NavIcon.vue'
const router = useRouter()
</script>
<template>
  <AppLayout>
    <div class="content">
      <PageHeader :title="t('accessDeniedTitle')" />
      <section class="panel denied-panel" role="alert">
        <NavIcon name="alert" />
        <h2>{{ t('accessDeniedMessage') }}</h2>
        <p>{{ t('accessDeniedHelp') }}</p>
        <Button class="save-btn" @click="router.replace('/dashboard')">{{ t('backToDashboard') }}</Button>
      </section>
    </div>
  </AppLayout>
</template>
<style scoped>
.denied-panel { max-width: 640px; padding: 36px; }
.denied-panel > svg { color: #8b713e; width: 40px; height: 40px; margin-bottom: 18px; }
.denied-panel h2 { max-width: 480px; }
</style>

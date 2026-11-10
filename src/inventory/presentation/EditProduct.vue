<script setup>
import './inventory.css'
import AppLayout from '../../shared/presentation/layouts/AppLayout.vue'
import PageHeader from '../../shared/presentation/components/PageHeader.vue'
import Button from 'primevue/button'
import { useRouter } from 'vue-router'
import { t } from '../../i18n.js'
const router = useRouter()
</script>

<template>
  <AppLayout>
    <div class="content inventory-page">
      <PageHeader :title="t('editProduct')" :description="t('editProductSubtitle')" />
      <p class="panel" role="status">La API no ofrece actualización de productos. <Button @click="router.push('/products')">Volver a productos</Button></p>
    </div>
  </AppLayout>
</template>

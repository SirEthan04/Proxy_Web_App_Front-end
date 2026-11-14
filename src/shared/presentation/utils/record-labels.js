import { ref } from 'vue'
import { useProductsStore } from '../../../inventory/application/inventory.js'
import { useAuthStore } from '../../../iam/application/auth.js'
import { PERMISSIONS } from '../../../iam/domain/permissions.js'
import { queryApi } from '../../infrastructure/query-client.js'
import { getProductLots } from '../../../inventory/infrastructure/inventory-api.js'
import { productLabel, responsibleLabel, lotLabel } from './presentation.js'
export function useRecordLabels() {
  const inventory = useProductsStore(), auth = useAuthStore()
  const users = ref([]), lots = ref({})
  async function loadRelated(productIds = inventory.products.map(p => p.id)) {
    const requests = [...new Set(productIds)].map(async id => {
      const rows = (await getProductLots(id)).data
      for (const lot of rows) lots.value[lot.id] = { code: lot.lotCode, productId: lot.productId }
    })
    if (auth.can(PERMISSIONS.USERS_READ)) requests.push((async () => { users.value = (await queryApi.get('/users')).data.map(u => ({ id: u.id, name: u.name })) })())
    await Promise.allSettled(requests) // Names are optional; never fabricate a failed lookup.
  }
  return {
    loadRelated,
    product: id => productLabel(id, inventory.loadError ? [] : inventory.products),
    responsible: id => responsibleLabel(id, [...users.value, ...(auth.user ? [auth.user] : [])]),
    lot: id => lotLabel(id, lots.value[id]?.code)
  }
}

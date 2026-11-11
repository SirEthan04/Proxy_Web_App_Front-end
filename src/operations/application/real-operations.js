import { defineStore } from 'pinia'
import * as api from '../infrastructure/real-operations-api.js'
import { adaptMovements, adaptWastes, adaptCount, adaptLots } from '../infrastructure/real-operations.assembler.js'
import { prepareWaste, prepareCount } from '../domain/real-operations.js'
import { useAuthStore } from '../../iam/application/auth.js'
import { PERMISSIONS } from '../../iam/domain/permissions.js'
import { useProductsStore } from '../../inventory/application/inventory.js'
export const useRealOperationsStore = defineStore('real-operations', {
  state: () => ({ movements: [], wastes: [], count: null, loadingMovements: false, loadingWastes: false, loadingCount: false, movementsError: null, wastesError: null, countError: null, submitting: false, error: null, warning: null, needsReview: false }),
  actions: {
    async loadMovements() {
      if (this.loadingMovements) return
      this.loadingMovements = true; this.movementsError = null; this.movements = []
      try { this.movements = adaptMovements((await api.getMovements()).data) }
      catch (e) { this.movementsError = api.operationsError(e) }
      finally { this.loadingMovements = false }
    },
    async loadWastes() {
      if (this.loadingWastes) return
      this.loadingWastes = true; this.wastesError = null; this.wastes = []
      try { this.wastes = adaptWastes((await api.getRealWastes()).data) }
      catch (e) { this.wastesError = api.operationsError(e) }
      finally { this.loadingWastes = false }
    },
    async loadCount(id) {
      if (this.loadingCount) return
      this.loadingCount = true; this.countError = null; this.count = null
      try { this.count = adaptCount((await api.getInventoryCount(id)).data) }
      catch (e) { this.countError = api.operationsError(e) }
      finally { this.loadingCount = false }
    },
    async registerWaste(draft) { return this.register('waste', draft) },
    async registerCount(draft) { return this.register('count', draft) },
    async register(kind, draft) {
      useAuthStore().requirePermission(kind === 'waste' ? PERMISSIONS.WASTE_WRITE : PERMISSIONS.OPERATIONS_WRITE)
      if (this.submitting) throw new Error('Hay una solicitud en curso.')
      if (this.needsReview) throw new Error('Resultado anterior incierto: verifica los registros con el equipo antes de volver a enviar.')
      this.submitting = true; this.error = null; this.warning = null
      let attempted = false
      const inventory = useProductsStore()
      try {
        await inventory.loadProducts()
        let result
        if (kind === 'waste') {
          const lots = await loadRealLots(draft.productId)
          const payload = prepareWaste(draft, inventory.products, lots)
          attempted = true
          result = adaptWastes([(await api.createRealWaste(payload)).data])[0]
        } else {
          const ids = [...new Set(draft.items.map(i => i.productId))]
          const lots = (await Promise.all(ids.map(loadRealLots))).flat()
          const payload = prepareCount(draft, inventory.products, lots)
          attempted = true
          result = adaptCount((await api.createInventoryCount(payload)).data)
          this.count = result
        }
        // Authoritative response is successful even if a later GET fails.
        const refresh = await Promise.allSettled([inventory.loadProducts(), this.loadMovements(), ...(kind === 'waste' ? [this.loadWastes()] : [])])
        if (refresh.some(r => r.status === 'rejected') || this.movementsError || kind === 'waste' && this.wastesError) this.warning = 'Registro guardado, pero no se pudieron refrescar todos los datos. Recarga antes de continuar.'
        return result
      } catch (e) {
        if (attempted && (!e.response || e.response.status >= 500)) this.needsReview = true
        this.error = api.operationsError(e) + (this.needsReview ? ' El resultado puede ser incierto; no repitas el registro sin verificarlo.' : '')
        throw new Error(this.error)
      } finally { this.submitting = false }
    }
  }
})
// Form-scoped lot reads have no stock cache: Inventory remains the source of stock.
export async function loadRealLots(productId) { return adaptLots((await api.getLots(productId)).data) }

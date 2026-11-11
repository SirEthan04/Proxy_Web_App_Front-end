import { defineStore } from 'pinia'
import * as api from '../infrastructure/real-operations-api.js'
import { adaptMovements, adaptWastes, adaptCount, adaptLots } from '../infrastructure/real-operations.assembler.js'
import { WRITE_BLOCKED } from '../domain/real-operations.js'
export const useRealOperationsStore = defineStore('real-operations', {
  state: () => ({ movements: [], wastes: [], count: null, loadingMovements: false, loadingWastes: false, loadingCount: false, movementsError: null, wastesError: null, countError: null }),
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
    async registerWaste() { throw new Error(WRITE_BLOCKED) },
    async registerCount() { throw new Error(WRITE_BLOCKED) }
  }
})
// Form-scoped lot reads have no stock cache: Inventory remains the source of stock.
export async function loadRealLots(productId) { return adaptLots((await api.getLots(productId)).data) }

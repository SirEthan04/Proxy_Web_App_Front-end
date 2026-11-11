import { defineStore } from 'pinia'
import { useAuthStore } from '../../iam/application/auth.js'
import { PERMISSIONS } from '../../iam/domain/permissions.js'
import { useProductsStore } from '../../inventory/application/inventory.js'
import * as api from '../infrastructure/real-commercial-api.js'
import { adaptDocument, createPayload } from '../domain/backend-commercial.js'
import { commercialWorkflow } from './backend-workflow.js'
import { requireRealSession } from '../../iam/infrastructure/session.js'

export const IAM_BLOCK = 'Inicia sesión con un usuario autorizado para registrar operaciones.'
async function resolveUser() { return requireRealSession() }
const permission = (kind, write = false) => {
  if (!['purchase', 'sale'].includes(kind)) throw new Error('Tipo de operación no válido.')
  return kind === 'purchase' ? (write ? PERMISSIONS.PURCHASES_CREATE : PERMISSIONS.PURCHASES_READ) : (write ? PERMISSIONS.SALES_CREATE : PERMISSIONS.SALES_READ)
}
export const useCommercialStore = defineStore('real-commercial', {
  state: () => ({ purchases: [], sales: [], lots: {}, loading: false, loadError: null, submitting: false, error: null, activeDocumentId: null, warning: null, needsReview: false }),
  getters: { writeBlocked: state => state.needsReview ? 'Resultado incierto: consulta el documento antes de volver a enviar.' : useAuthStore().can(PERMISSIONS.PURCHASES_CREATE) || useAuthStore().can(PERMISSIONS.SALES_CREATE) ? null : IAM_BLOCK },
  actions: {
    upsert(kind, document) {
      const rows = kind === 'purchase' ? this.purchases : this.sales
      const adapted = adaptDocument(document, useProductsStore().products)
      const index = rows.findIndex(d => d.id === document.id)
      if (index < 0) rows.push(adapted)
      else rows[index] = adapted
      return adapted
    },
    async load(kind, id = null) {
      useAuthStore().requirePermission(permission(kind))
      this.loading = true; this.loadError = null
      try {
        await useProductsStore().loadProducts()
        const response = id ? await api.getDocument(kind, id) : await api.getDocuments(kind)
        if (id) this.upsert(kind, response.data)
        else this[kind === 'purchase' ? 'purchases' : 'sales'] = response.data.map(d => adaptDocument(d, useProductsStore().products))
      } catch (error) { this.loadError = api.commercialError(error); throw new Error(this.loadError) }
      finally { this.loading = false }
    },
    async loadLots(productId) {
      try { this.lots[productId] = (await api.getLots(productId)).data }
      catch (error) { throw new Error(api.commercialError(error)) }
    },
    workflow() {
      return commercialWorkflow({ api, resolveUser, refresh: async kind => {
        this.lots = {}
        await this.load(kind)
      } })
    },
    async register(kind, lines) {
      useAuthStore().requirePermission(permission(kind, true))
      if (this.needsReview) throw new Error(this.writeBlocked)
      if (this.submitting) throw new Error('Hay una solicitud en curso.')
      this.submitting = true; this.error = null; this.activeDocumentId = null
      let attempted = false
      try {
        const payload = createPayload(lines, useProductsStore().products, this.lots)
        const document = await this.workflow().create(kind, () => { attempted = true; return payload })
        this.activeDocumentId = document.id
        const adapted = this.upsert(kind, document)
        try { await this.load(kind) } catch { this.warning = 'El borrador se creó, pero no se pudo actualizar el listado. Refresca antes de continuar.' }
        return adapted
      } catch (error) {
        if (attempted && (!error.response || error.response.status >= 500)) this.needsReview = true
        this.error = api.commercialError(error, true); throw new Error(this.error)
      }
      finally { this.submitting = false }
    },
    async confirm(kind, id) {
      useAuthStore().requirePermission(permission(kind, true))
      if (this.needsReview) throw new Error(this.writeBlocked)
      if (this.submitting) throw new Error('Hay una confirmación en curso.')
      this.submitting = true; this.error = null; this.warning = null
      try {
        const result = await this.workflow().confirm(kind, id)
        this.upsert(kind, result.document)
        if (result.refreshError) this.warning = 'La operación fue confirmada, pero no se pudo refrescar el stock. Actualiza antes de continuar.'
        return result.document
      } catch (error) {
        this.error = api.commercialError(error, true)
        // Read-only reconciliation, never retry a POST automatically (including 409).
        try { await this.load(kind, id) } catch { /* loadError remains visible */ }
        throw new Error(this.error)
      } finally { this.submitting = false }
    }
  }
})

// Pure orchestration permits controlled write tests without touching MySQL.
export function commercialWorkflow({ api, resolveUser, refresh }) {
  return {
    async create(kind, buildPayload) {
      await resolveUser()
      const response = await api.createDocument(kind, buildPayload())
      if (response.data?.status !== 'Draft') throw new Error('El backend no devolvió un borrador válido. Consulta el historial antes de repetir.')
      return response.data
    },
    async confirm(kind, id) {
      await resolveUser()
      const current = (await api.getDocument(kind, id)).data
      if (current.status !== 'Draft') throw new Error('La operación ya no es un borrador. Actualiza el detalle.')
      const response = await api.confirmDocument(kind, id)
      if (response.data?.status !== 'Confirmed') throw new Error('El backend no devolvió una confirmación válida. Consulta el documento antes de repetir.')
      // Confirmation is authoritative even if the subsequent refresh fails.
      let refreshError = null
      try { await refresh(kind) } catch (error) { refreshError = error }
      return { document: response.data, refreshError }
    }
  }
}

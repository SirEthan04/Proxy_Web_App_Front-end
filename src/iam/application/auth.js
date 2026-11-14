import { defineStore } from 'pinia'
import { permissionsForRole } from '../domain/permissions.js'
import { loginUser, getCurrentUser, authError } from '../infrastructure/auth-service.js'
import { session, clearSession, validSession, acceptToken, acceptUser, requireRealSession, sessionRevision } from '../infrastructure/session.js'
export const useAuthStore = defineStore('auth', {
  state: () => ({ session, initialized: false, error: null, submitting: false }),
  getters: {
    user: state => state.session.user,
    isAuthenticated: () => validSession(),
    permissions: state => permissionsForRole(state.session.user?.role),
    can() { return permission => this.isAuthenticated && this.permissions.includes(permission) }
  },
  actions: {
    requirePermission(permission) {
      requireRealSession()
      if (!this.can(permission)) throw new Error('No tienes permisos para realizar esta operación.')
    },
    async loadUser() {
      this.error = null
      try {
        if (session.accessToken) acceptUser((await getCurrentUser()).data)
      } catch (error) { clearSession(); this.error = authError(error) }
      finally { this.initialized = true }
    },
    async login(email, password) {
      if (this.submitting) return false
      this.submitting = true; this.error = null; clearSession()
      const revision = sessionRevision()
      try {
        if (!email.trim() || email.trim().length > 180 || !password || password.length > 128) throw new Error('Introduce correo y contraseña válidos.')
        const result = (await loginUser(email, password)).data
        if (revision !== sessionRevision()) return false
        acceptToken(result)
        const user = (await getCurrentUser()).data
        if (revision !== sessionRevision()) return false
        acceptUser(user)
        return true
      } catch (error) { clearSession(); this.error = authError(error); return false }
      finally { this.initialized = true; this.submitting = false }
    },
    logout() {
      clearSession(); this.error = null; this.initialized = true
      try { globalThis.localStorage?.removeItem('user') } catch { /* Old demo identity is never read. */ }
    }
  }
})

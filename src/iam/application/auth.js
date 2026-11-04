import { defineStore } from 'pinia'
import { authenticateDemoUser, validateDemoSession } from '../infrastructure/auth-service.js'

export const useAuthStore = defineStore('auth', {
  state: () => ({ user: null, initialized: false, error: null }),
  getters: {
    isAuthenticated: state => state.user !== null
  },
  actions: {
    loadUser() {
      this.user = null
      this.error = null
      try {
        const saved = localStorage.getItem('user')
        if (saved) {
          const user = validateDemoSession(JSON.parse(saved))
          if (!user) throw new Error('Invalid demo session')
          // Sanitize sessions created by the previous demo implementation.
          localStorage.setItem('user', JSON.stringify(user))
          this.user = user
        }
      } catch {
        this.error = 'sessionRestoreFailed'
        try { localStorage.removeItem('user') } catch { /* Storage can be unavailable. */ }
      } finally {
        this.initialized = true
      }
    },
    login(email, password) {
      this.error = null
      const user = authenticateDemoUser(email, password)
      if (!user) {
        this.error = 'invalidCredentials'
        return false
      }
      try {
        localStorage.setItem('user', JSON.stringify(user))
        this.user = user
        return true
      } catch {
        this.user = null
        this.error = 'sessionStorageFailed'
        return false
      }
    },
    logout() {
      this.user = null
      this.error = null
      try { localStorage.removeItem('user') } catch { this.error = 'sessionStorageFailed' }
    }
  }
})

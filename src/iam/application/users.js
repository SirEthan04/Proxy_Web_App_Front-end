import { toRaw } from 'vue'
import { defineStore } from 'pinia'
import { getUsers } from '../infrastructure/user-api.js'

const pendingLoads = new WeakMap()

export const useUsersStore = defineStore('users', {
  state: () => ({
    users: [],
    loading: false,
    loadError: null,
    saving: false,
    error: null
  }),
  actions: {
    clearSessionData() {
      pendingLoads.delete(toRaw(this.$state))
      this.$reset()
    },
    loadUsers() {
      if (pendingLoads.has(toRaw(this.$state))) return pendingLoads.get(toRaw(this.$state))
      this.loading = true
      this.loadError = null
      const request = (async () => {
        try {
          const response = await getUsers()
          if (pendingLoads.get(toRaw(this.$state)) === request) this.users = response.data
          return response.data
        } catch (error) {
          if (pendingLoads.get(toRaw(this.$state)) === request) this.loadError = 'loadUsersFailed'
          throw error
        } finally {
          if (pendingLoads.get(toRaw(this.$state)) === request) {
            this.loading = false
            pendingLoads.delete(toRaw(this.$state))
          }
        }
      })()
      pendingLoads.set(toRaw(this.$state), request)
      return request
    }
  }
})

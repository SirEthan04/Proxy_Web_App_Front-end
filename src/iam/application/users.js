import { defineStore } from 'pinia'
import { getUsers } from '../infrastructure/user-api.js'

export const useUsersStore = defineStore('users', {
    state: () => ({
        users: []
    }),

    actions: {
        async loadUsers() {
            try {
                const response = await getUsers()
                this.users = response.data
            } catch (error) {
                console.error('Error cargando usuarios:', error)
            }
        }
    }
})
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null
    }),

    actions: {
        loadUser() {
            const savedUser = localStorage.getItem('user')

            if (savedUser) {
                this.user = JSON.parse(savedUser)
            }
        },

        login(email, password) {
            const users = [
                {
                    name: 'Dany',
                    email: 'admin@bodego.com',
                    password: '1234',
                    role: 'Administrador'
                },
                {
                    name: 'Mateo',
                    email: 'empleado@bodego.com',
                    password: '1234',
                    role: 'Empleado'
                }
            ]

            const userFound = users.find(
                user =>
                    user.email === email &&
                    user.password === password
            )

            if (!userFound) {
                return false
            }

            this.user = userFound

            localStorage.setItem(
                'user',
                JSON.stringify(userFound)
            )

            return true
        },

        logout() {
            this.user = null
            localStorage.removeItem('user')
        }
    }
})
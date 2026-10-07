import { t } from '../../i18n.js'
import { defineStore } from 'pinia'
import {
    getWastes,
    createWaste
} from '../infrastructure/waste-api.js'

export const useWasteStore = defineStore('waste', {
    state: () => ({
        wastes: []
    }),

    actions: {
        async loadWastes() {
            try {
                const response = await getWastes()
                this.wastes = response.data
            } catch (error) {
                console.error('Error cargando mermas:', error)
            }
        },

        async addWaste(waste) {
            try {
                const response = await createWaste({
                    ...waste,
                    date: new Date().toLocaleString()
                })

                this.wastes.push(response.data)
            } catch (error) {
                console.error('Error registrando merma:', error)
                alert(t('wasteFailed'))
            }
        }
    }
})
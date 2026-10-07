import { t } from '../../i18n.js'
import { defineStore } from 'pinia'
import {
    getOperations,
    createOperation
} from '../infrastructure/operation-api.js'

export const useOperationsStore = defineStore('operations', {
    state: () => ({
        operations: []
    }),

    actions: {
        async loadOperations() {
            try {
                const response = await getOperations()
                this.operations = response.data
            } catch (error) {
                console.error('Error cargando operaciones:', error)
            }
        },

        async addOperation(operation) {
            try {
                const response = await createOperation({
                    ...operation,
                    date: new Date().toLocaleString()
                })

                this.operations.push(response.data)
            } catch (error) {
                console.error('Error registrando operación:', error)
                alert(t('operationFailed'))
            }
        }
    }
})
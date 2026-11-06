import { operationsApi as api } from '../../shared/infrastructure/http-client.js'

export const getOperations = () => {
    return api.get('/operations')
}

export const createOperation = (operation) => {
    return api.post('/operations', operation)
}
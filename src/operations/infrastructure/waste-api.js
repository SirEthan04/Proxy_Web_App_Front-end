import { operationsApi as api } from '../../shared/infrastructure/http-client.js'

export const getWastes = () => {
    return api.get('/wastes')
}

export const createWaste = (waste) => {
    return api.post('/wastes', waste)
}
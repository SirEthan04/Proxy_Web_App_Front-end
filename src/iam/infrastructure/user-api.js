import { catalogApi as api } from '../../shared/infrastructure/http-client.js'

export const getUsers = () => {
    return api.get('/users')
}
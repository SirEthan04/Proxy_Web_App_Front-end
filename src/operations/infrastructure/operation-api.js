import axios from 'axios'

const api = axios.create({
    baseURL: 'http://localhost:3000'
})

export const getOperations = () => {
    return api.get('/operations')
}

export const createOperation = (operation) => {
    return api.post('/operations', operation)
}
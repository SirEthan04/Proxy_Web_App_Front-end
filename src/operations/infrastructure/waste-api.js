import axios from 'axios'

const api = axios.create({
    baseURL: 'http://localhost:3000'
})

export const getWastes = () => {
    return api.get('/wastes')
}

export const createWaste = (waste) => {
    return api.post('/wastes', waste)
}
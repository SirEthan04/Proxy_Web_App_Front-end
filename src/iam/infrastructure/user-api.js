import axios from 'axios'

const api = axios.create({
    baseURL: 'https://6ac6bb3dbea0e72cf5c93893.mockapi.io'
})

export const getUsers = () => {
    return api.get('/users')
}
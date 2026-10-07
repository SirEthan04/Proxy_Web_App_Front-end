import { createRouter, createWebHistory } from 'vue-router'

import Login from '../iam/presentation/Login.vue'
import Dashboard from '../reporting/presentation/Dashboard.vue'
import Users from '../iam/presentation/Users.vue'
import Products from '../inventory/presentation/Products.vue'
import NewProduct from '../inventory/presentation/NewProduct.vue'
import EditProduct from '../inventory/presentation/EditProduct.vue'

import Operations from '../operations/presentation/Operations.vue'
import Waste from '../operations/presentation/Waste.vue'

import Alerts from '../monitoring/presentation/Alerts.vue'
import Reports from '../reporting/presentation/Reports.vue'

const routes = [
    {
        path: '/',
        redirect: '/login'
    },
    {
        path: '/login',
        component: Login
    },
    {
        path: '/dashboard',
        component: Dashboard
    },

    {
        path: '/products',
        component: Products
    },
    {
        path: '/products/new',
        component: NewProduct
    },
    {
        path: '/products/edit/:id',
        component: EditProduct
    },

    {
        path: '/operations',
        component: Operations
    },
    {
        path: '/alerts',
        component: Alerts
    },
    {
        path: '/reports',
        component: Reports
    },
    {
        path: '/waste',
        component: Waste
    },
    {
        path: '/users',
        component: Users
    },

]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
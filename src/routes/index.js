import { authenticationGuard } from '../iam/infrastructure/authentication-guard.js'
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
        component: Dashboard,
        meta: { requiresAuth: true }
    },

    {
        path: '/products',
        component: Products,
        meta: { requiresAuth: true }
    },
    {
        path: '/products/new',
        component: NewProduct,
        meta: { requiresAuth: true }
    },
    {
        path: '/products/edit/:id',
        component: EditProduct,
        meta: { requiresAuth: true }
    },

    {
        path: '/operations',
        component: Operations,
        meta: { requiresAuth: true }
    },
    {
        path: '/alerts',
        component: Alerts,
        meta: { requiresAuth: true }
    },
    {
        path: '/reports',
        component: Reports,
        meta: { requiresAuth: true }
    },
    {
        path: '/waste',
        component: Waste,
        meta: { requiresAuth: true }
    },
    {
        path: '/users',
        component: Users,
        meta: { requiresAuth: true }
    },

]

const router = createRouter({
    history: createWebHistory(),
    routes
})

router.beforeEach(authenticationGuard)

export default router
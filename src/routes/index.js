import Purchases from '../commercial/presentation/Purchases.vue'
import Sales from '../commercial/presentation/Sales.vue'
import NewPurchase from '../commercial/presentation/NewPurchase.vue'
import NewSale from '../commercial/presentation/NewSale.vue'
import CommercialDetails from '../commercial/presentation/CommercialDetails.vue'
import ProductDetails from '../inventory/presentation/ProductDetails.vue'
import { PERMISSIONS } from '../iam/domain/permissions.js'
import AccessDenied from '../iam/presentation/AccessDenied.vue'
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
    { path: '/purchases', component: Purchases, meta: { requiresAuth: true, permission: PERMISSIONS.PURCHASES_READ } },
    { path: '/purchases/new', component: NewPurchase, meta: { requiresAuth: true, permission: PERMISSIONS.PURCHASES_CREATE } },
    { path: '/purchases/:id', component: CommercialDetails, props: { kind: 'purchase' }, meta: { requiresAuth: true, permission: PERMISSIONS.PURCHASES_READ } },
    { path: '/sales', component: Sales, meta: { requiresAuth: true, permission: PERMISSIONS.SALES_READ } },
    { path: '/sales/new', component: NewSale, meta: { requiresAuth: true, permission: PERMISSIONS.SALES_CREATE } },
    { path: '/sales/:id', component: CommercialDetails, props: { kind: 'sale' }, meta: { requiresAuth: true, permission: PERMISSIONS.SALES_READ } },
    { path: '/products/:id', component: ProductDetails, meta: { requiresAuth: true, permission: PERMISSIONS.PRODUCTS_READ } },
    { path: '/access-denied', component: AccessDenied, meta: { requiresAuth: true } },
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
        meta: { requiresAuth: true, permission: PERMISSIONS.DASHBOARD_READ }
    },

    {
        path: '/products',
        component: Products,
        meta: { requiresAuth: true, permission: PERMISSIONS.PRODUCTS_READ }
    },
    {
        path: '/products/new',
        component: NewProduct,
        meta: { requiresAuth: true, permission: PERMISSIONS.PRODUCTS_CREATE }
    },
    {
        path: '/products/edit/:id',
        component: EditProduct,
        meta: { requiresAuth: true, permission: PERMISSIONS.PRODUCTS_EDIT }
    },

    {
        path: '/operations',
        component: Operations,
        meta: { requiresAuth: true, permission: PERMISSIONS.OPERATIONS_WRITE }
    },
    {
        path: '/alerts',
        component: Alerts,
        meta: { requiresAuth: true, permission: PERMISSIONS.ALERTS_READ }
    },
    {
        path: '/reports',
        component: Reports,
        meta: { requiresAuth: true, permission: PERMISSIONS.REPORTS_READ }
    },
    {
        path: '/waste',
        component: Waste,
        meta: { requiresAuth: true, permission: PERMISSIONS.WASTE_WRITE }
    },
    {
        path: '/users',
        component: Users,
        meta: { requiresAuth: true, permission: PERMISSIONS.USERS_READ }
    },

]

const router = createRouter({
    history: createWebHistory(),
    routes
})

router.beforeEach(authenticationGuard)

export default router

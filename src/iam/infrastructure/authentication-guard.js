import { useAuthStore } from '../application/auth.js'
import { validSession } from './session.js'

export async function authenticationGuard(to) {
  const auth = useAuthStore()
  validSession()
  if (!auth.initialized) await auth.loadUser()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath }, replace: true }
  }
  if (to.meta.permission && !auth.can(to.meta.permission)) return { path: '/access-denied', replace: true }
  if (to.path === '/login' && auth.isAuthenticated) return { path: '/dashboard', replace: true }
}

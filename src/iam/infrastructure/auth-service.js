// Temporary demo authentication. The backend must enforce identity and permissions.
import { getUsers } from './user-api.js'
import { USER_ROLES } from '../domain/user.js'

const publicIdentity = account => account && Object.values(USER_ROLES).includes(account.role)
  ? { name: account.name, email: account.email, role: account.role } : null

export async function authenticateDemoUser(email, password) {
  const { data: users } = await getUsers()
  const account = users.find(user => user.email === email.trim() && user.password === password)
  return publicIdentity(account)
}

export async function validateDemoSession(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const { data: users } = await getUsers()
  const account = users.find(user => user.email === value.email && user.name === value.name && user.role === value.role)
  return publicIdentity(account)
}

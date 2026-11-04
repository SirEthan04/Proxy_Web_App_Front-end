// Temporary demo authentication. The backend must enforce identity and permissions.
const demoUsers = [
  { name: 'Dany', email: 'admin@bodego.com', password: '1234', role: 'Administrador' },
  { name: 'Mateo', email: 'empleado@bodego.com', password: '1234', role: 'Empleado' }
]

export function authenticateDemoUser(email, password) {
  const account = demoUsers.find(user => user.email === email.trim() && user.password === password)
  return account ? { name: account.name, email: account.email, role: account.role } : null
}

export function validateDemoSession(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const account = demoUsers.find(user => user.email === value.email && user.name === value.name && user.role === value.role)
  return account ? { name: account.name, email: account.email, role: account.role } : null
}

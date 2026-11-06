// Demo authorization policy. The future backend must enforce these permissions.
export const PERMISSIONS = Object.freeze({
  PURCHASES_CREATE: 'purchases.create',
  PURCHASES_READ: 'purchases.read',
  SALES_CREATE: 'sales.create',
  SALES_READ: 'sales.read',
  DASHBOARD_READ: 'dashboard.read',
  PRODUCTS_READ: 'products.read',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_EDIT: 'products.edit',
  PRODUCTS_DELETE: 'products.delete',
  OPERATIONS_WRITE: 'operations.write',
  WASTE_WRITE: 'waste.write',
  ALERTS_READ: 'alerts.read',
  REPORTS_READ: 'reports.read',
  USERS_READ: 'users.read'
})

const rolePermissions = Object.freeze({
  Administrador: Object.freeze(Object.values(PERMISSIONS)),
  Empleado: Object.freeze([
    PERMISSIONS.PURCHASES_CREATE,
    PERMISSIONS.PURCHASES_READ,
    PERMISSIONS.SALES_CREATE,
    PERMISSIONS.SALES_READ,
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.OPERATIONS_WRITE,
    PERMISSIONS.WASTE_WRITE,
    PERMISSIONS.ALERTS_READ
  ])
})

export function permissionsForRole(role) {
  return Object.hasOwn(rolePermissions, role) ? rolePermissions[role] : []
}

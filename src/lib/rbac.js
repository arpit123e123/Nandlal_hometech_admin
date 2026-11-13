export const ROLES = ['OWNER', 'MANAGER', 'STAFF', 'TECHNICIAN']
const ALL = [
  'dashboard', 'products.view', 'products.write', 'products.delete', 'products.cost', 'categories.write',
  'inventory.view', 'stock.write', 'purchases.write', 'suppliers.view',
  'billing.view', 'billing.create', 'billing.cancel', 'udhaar.view', 'udhaar.collect',
  'repairs.all', 'repairs.assigned', 'repairs.create', 'repairs.update',
  'customers.view', 'customers.write', 'customers.broadcast',
  'reports.view', 'reports.profit', 'settings', 'users', 'branches', 'activity.all', 'activity.branch', 'activity.own',
]
export const PERMS = {
  OWNER: ALL,
  MANAGER: ALL.filter((p) => !['products.delete', 'products.cost_none', 'billing.cancel', 'reports.profit', 'settings', 'users', 'branches', 'activity.all', 'customers.broadcast', 'activity.own'].includes(p)),
  STAFF: ['dashboard', 'products.view', 'inventory.view', 'stock.write', 'billing.view', 'billing.create', 'udhaar.view', 'repairs.all', 'repairs.create', 'customers.view', 'customers.write', 'activity.own'],
  TECHNICIAN: ['repairs.assigned', 'repairs.update'],
}
export const can = (role, perm) => !!PERMS[role]?.includes(perm)
// MANAGER keeps cost price; STAFF does not
PERMS.STAFF = PERMS.STAFF.filter((p) => p !== 'products.cost')
export const STATUSES = ['Received', 'Diagnosing', 'In Progress', 'Waiting for Parts', 'Ready for Pickup', 'Delivered', 'Closed']

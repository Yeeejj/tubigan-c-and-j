import { ROLE_MODULES, type UserRole } from '@/constants/roles';

export function canAccessModule(role: UserRole, module: string): boolean {
  return ROLE_MODULES[role]?.includes(module) ?? false;
}

export function canCreateOrders(role: UserRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'in_shop_staff';
}

export function canManageStaff(role: UserRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canViewSales(role: UserRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canManageInventory(role: UserRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'in_shop_staff';
}

export function canDeleteOrders(role: UserRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canAssignDelivery(role: UserRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'in_shop_staff';
}

export function isWebRole(role: UserRole): boolean {
  return role !== 'delivery_staff';
}

export function isMobileRole(role: UserRole): boolean {
  return role === 'delivery_staff';
}

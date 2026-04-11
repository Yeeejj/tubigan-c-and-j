export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  IN_SHOP_STAFF: 'in_shop_staff',
  DELIVERY_STAFF: 'delivery_staff',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  in_shop_staff: 'In-Shop Staff',
  delivery_staff: 'Delivery Staff',
};

// Which modules each role can access
export const ROLE_MODULES: Record<UserRole, string[]> = {
  owner: ['dashboard', 'orders', 'delivery', 'process', 'inventory', 'sales', 'staff', 'archive'],
  admin: ['dashboard', 'orders', 'delivery', 'process', 'inventory', 'sales', 'staff', 'archive'],
  in_shop_staff: ['dashboard', 'orders', 'process', 'inventory'],
  delivery_staff: ['delivery', 'inventory'],
};

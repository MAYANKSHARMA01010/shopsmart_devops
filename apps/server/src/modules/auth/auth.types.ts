import { Role } from '@prisma/client';

export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
}

export type Permission =
  | 'products:create'
  | 'products:update'
  | 'products:delete'
  | 'categories:create'
  | 'categories:update'
  | 'categories:delete'
  | 'orders:read_all'
  | 'orders:update_status'
  | 'users:read_all'
  | 'users:delete'
  | 'admin:stats'
  | 'cart:read'
  | 'cart:write';

export const RolePermissions: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    'products:create', 'products:update', 'products:delete',
    'categories:create', 'categories:update', 'categories:delete',
    'orders:read_all', 'orders:update_status',
    'users:read_all', 'users:delete',
    'admin:stats',
    'cart:read', 'cart:write'
  ],
  ADMIN: [
    'products:create', 'products:update', 'products:delete',
    'categories:create', 'categories:update', 'categories:delete',
    'orders:read_all', 'orders:update_status',
    'users:read_all',
    'admin:stats',
    'cart:read', 'cart:write'
  ],
  VENDOR: [
    'products:create', 'products:update',
    'categories:create', 'categories:update',
    'cart:read', 'cart:write'
  ],
  CUSTOMER: [
    'cart:read', 'cart:write'
  ]
};

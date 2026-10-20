import type { PermissionGrant } from './permission-grant.type.js';
import type { UserRole } from './user-role.type.js';

export type PermissionPolicy = Readonly<
  Partial<Record<UserRole, readonly PermissionGrant[]>>
>;

import type { Permission } from '../enums/permission.enum.js';
import type { UserRole } from './user-role.type.js';

export type PermissionPolicy = Readonly<
  Record<UserRole, readonly Permission[]>
>;

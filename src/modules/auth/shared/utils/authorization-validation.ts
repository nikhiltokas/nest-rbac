import { Role } from '../constants/role.constant.js';
import type { PermissionPolicy } from '../contracts/permission-policy.type.js';
import type { UserRole } from '../contracts/user-role.type.js';
import { Permission } from '../enums/permission.enum.js';

function isUserRole(value: unknown): value is UserRole {
  return Object.values(Role).some((role) => role === value);
}

function isPermission(value: unknown): value is Permission {
  return Object.values(Permission).some((permission) => permission === value);
}

export function isPermissionList(
  value: unknown,
): value is [Permission, ...Permission[]] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    Array.from(value).every(isPermission)
  );
}

export function isRoleList(value: unknown): value is [UserRole, ...UserRole[]] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    Array.from(value).every(isUserRole)
  );
}

export function isPermissionPolicy(value: unknown): value is PermissionPolicy {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const roles = Object.values(Role);
  return (
    Reflect.ownKeys(value).length === roles.length &&
    roles.every((role) => {
      if (!Object.hasOwn(value, role)) return false;
      const granted: unknown = Reflect.get(value, role);
      return Array.isArray(granted) && Array.from(granted).every(isPermission);
    })
  );
}

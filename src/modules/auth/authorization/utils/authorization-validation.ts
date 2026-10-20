import { Role } from '../constants/role.constant.js';
import type { PermissionPolicy } from '../contracts/permission-policy.type.js';
import type { UserRole } from '../contracts/user-role.type.js';
import type { PermissionGrant } from '../contracts/permission-grant.type.js';
import { Permissions } from '../enums/permissions.enum.js';
import { AccessScope } from '../enums/access-scope.enum.js';

export function isUserRole(value: unknown): value is UserRole {
  return Object.values(Role).some((role) => role === value);
}

export function isPermission(value: unknown): value is Permissions {
  return Object.values(Permissions).some((action) => action === value);
}

function isOwnList<Item>(
  value: unknown,
  isItem: (item: unknown) => item is Item,
): value is Item[] {
  return (
    Array.isArray(value) &&
    Array.from({ length: value.length }, (_, index) => index).every(
      (index) => Object.hasOwn(value, index) && isItem(ownValue(value, index)),
    )
  );
}

export function isPermissionList(
  value: unknown,
): value is [Permissions, ...Permissions[]] {
  return isOwnList(value, isPermission) && value.length > 0;
}

export function isRoleList(value: unknown): value is [UserRole, ...UserRole[]] {
  return isOwnList(value, isUserRole) && value.length > 0;
}

function ownValue(value: object, key: PropertyKey): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

export function isPermissionGrant(value: unknown): value is PermissionGrant {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const keys = Reflect.ownKeys(value);
  return (
    keys.length === 2 &&
    keys.includes('action') &&
    keys.includes('scope') &&
    isPermission(ownValue(value, 'action')) &&
    Object.values(AccessScope).some(
      (scope) => scope === ownValue(value, 'scope'),
    )
  );
}

export function isPermissionPolicy(value: unknown): value is PermissionPolicy {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const roles = Reflect.ownKeys(value);
  return (
    roles.length > 0 &&
    roles.every((role) => {
      if (!isUserRole(role)) return false;
      return isOwnList(ownValue(value, role), isPermissionGrant);
    })
  );
}

import type { PermissionPolicy } from '../contracts/permission-policy.type.js';
import type { UserRole } from '../contracts/user-role.type.js';
import { Permissions } from '../enums/permissions.enum.js';
import { AccessScope } from '../enums/access-scope.enum.js';
import {
  isPermission,
  isPermissionPolicy,
  isUserRole,
} from './authorization-validation.js';

/** Resolves explicit grants only. ANY subsumes OWN, regardless of grant order. */
export function evaluatePolicy(
  policy: PermissionPolicy,
  role: UserRole,
  action: Permissions,
): AccessScope | undefined {
  if (
    !isUserRole(role) ||
    !isPermission(action) ||
    !isPermissionPolicy(policy) ||
    !Object.hasOwn(policy, role)
  ) {
    return undefined;
  }

  let scope: AccessScope | undefined;
  for (const grant of policy[role] ?? []) {
    if (grant.action !== action) continue;
    if (grant.scope === AccessScope.ANY) return AccessScope.ANY;
    scope = grant.scope;
  }
  return scope;
}

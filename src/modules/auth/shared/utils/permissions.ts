import { ForbiddenException } from '@nestjs/common';
import type { PermissionPolicy } from '../contracts/permission-policy.type.js';
import type { UserRole } from '../contracts/user-role.type.js';
import type { Permission } from '../enums/permission.enum.js';

export function assertPermissions(
  policy: PermissionPolicy,
  role: UserRole,
  ...required: Permission[]
): void {
  const granted = Object.hasOwn(policy, role) ? policy[role] : [];
  const missing = required.filter(
    (permission) => !granted.includes(permission),
  );
  if (missing.length) {
    throw new ForbiddenException(`Missing permissions: ${missing.join(', ')}`);
  }
}

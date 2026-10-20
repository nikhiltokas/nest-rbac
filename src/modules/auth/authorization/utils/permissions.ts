import { ForbiddenException } from '@nestjs/common';
import type { PermissionPolicy } from '../contracts/permission-policy.type.js';
import type { UserRole } from '../contracts/user-role.type.js';
import type { Permissions } from '../enums/permissions.enum.js';
import { evaluatePolicy } from './evaluate-policy.js';

export function assertPermissions(
  policy: PermissionPolicy,
  role: UserRole,
  ...required: [Permissions, ...Permissions[]]
): void {
  const missing = required.filter(
    (action) => evaluatePolicy(policy, role, action) === undefined,
  );
  if (missing.length) {
    throw new ForbiddenException(`Missing permissions: ${missing.join(', ')}`);
  }
}

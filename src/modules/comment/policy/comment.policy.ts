import type { PermissionPolicy } from '../../auth/shared/contracts/permission-policy.type.js';
import { Permission } from '../../auth/shared/enums/permission.enum.js';

export const COMMENT_POLICY: PermissionPolicy = {
  SUPER_ADMIN: [
    Permission.CREATE,
    Permission.READ,
    Permission.UPDATE,
    Permission.DELETE,
  ],
  MODERATOR: [Permission.READ, Permission.DELETE],
  USER: [
    Permission.CREATE,
    Permission.READ,
    Permission.UPDATE,
    Permission.DELETE,
  ],
};

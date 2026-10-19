import type { PermissionPolicy } from '../../auth/shared/contracts/permission-policy.type.js';
import { Permission } from '../../auth/shared/enums/permission.enum.js';

export const NOTE_POLICY: PermissionPolicy = {
  SUPER_ADMIN: [
    Permission.CREATE,
    Permission.READ,
    Permission.UPDATE,
    Permission.DELETE,
  ],
  MODERATOR: [Permission.CREATE, Permission.READ, Permission.UPDATE],
  USER: [Permission.READ],
};

import type { PermissionPolicy } from '../../auth/authorization/contracts/permission-policy.type.js';
import { Permission } from '../../auth/authorization/constants/permission.constant.js';

export const NOTE_POLICY: PermissionPolicy = {
  SUPER_ADMIN: [
    Permission.CREATE.OWN,
    Permission.READ.ANY,
    Permission.UPDATE.ANY,
    Permission.DELETE.ANY,
  ],
  MODERATOR: [
    Permission.CREATE.OWN,
    Permission.READ.ANY,
    Permission.UPDATE.OWN,
  ],
  USER: [Permission.READ.OWN],
};

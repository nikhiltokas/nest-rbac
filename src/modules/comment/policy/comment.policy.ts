import type { PermissionPolicy } from '../../auth/authorization/contracts/permission-policy.type.js';
import { Permission } from '../../auth/authorization/constants/permission.constant.js';

export const COMMENT_POLICY: PermissionPolicy = {
  SUPER_ADMIN: [
    Permission.CREATE.OWN,
    Permission.READ.ANY,
    Permission.UPDATE.ANY,
    Permission.DELETE.ANY,
  ],
  MODERATOR: [Permission.READ.ANY, Permission.DELETE.ANY],
  USER: [
    Permission.CREATE.OWN,
    Permission.READ.OWN,
    Permission.UPDATE.OWN,
    Permission.DELETE.OWN,
  ],
};

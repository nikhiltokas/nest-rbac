import type { Permissions } from '../enums/permissions.enum.js';
import type { AccessScope } from '../enums/access-scope.enum.js';

export type PermissionGrant = Readonly<{
  action: Permissions;
  scope: AccessScope;
}>;

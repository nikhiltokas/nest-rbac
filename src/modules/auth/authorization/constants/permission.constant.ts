import { Permissions } from '../enums/permissions.enum.js';
import { AccessScope } from '../enums/access-scope.enum.js';

function scoped(action: Permissions) {
  return {
    OWN: { action, scope: AccessScope.OWN },
    ANY: { action, scope: AccessScope.ANY },
  } as const;
}

export const Permission = {
  CREATE: scoped(Permissions.CREATE),
  READ: scoped(Permissions.READ),
  UPDATE: scoped(Permissions.UPDATE),
  DELETE: scoped(Permissions.DELETE),
} as const;

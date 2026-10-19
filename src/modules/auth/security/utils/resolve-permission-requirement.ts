import { InternalServerErrorException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import {
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
  POLICY_KEY,
} from '../../shared/constants/auth-metadata.constant.js';

import type { PermissionPolicy } from '../../shared/contracts/permission-policy.type.js';
import type { Permission } from '../../shared/enums/permission.enum.js';

export function resolvePermissionRequirement(
  reflector: Reflector,
  controller: Function,
  handler: Function,
): { policy: PermissionPolicy; required: Permission[] } | undefined {
  const targets = [handler, controller];
  const policy = reflector.get<PermissionPolicy>(POLICY_KEY, controller);
  const required = reflector.getAllAndMerge<Permission[]>(
    PERMISSIONS_KEY,
    targets,
  );

  if (!required?.length) {
    const isPublic = reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      targets,
    );
    if (policy && !isPublic) {
      throw new InternalServerErrorException(
        `${controller.name}.${handler.name} has a policy but is missing required permissions. ` +
          'Add @RequirePermissions(...) or mark the route @Public().',
      );
    }
    return undefined;
  }

  if (!policy) {
    throw new InternalServerErrorException(
      `No permission policy configured for ${controller.name}.${handler.name}. ` +
        'Add @Policy(...) to the controller.',
    );
  }

  return { policy, required: [...new Set(required)] };
}

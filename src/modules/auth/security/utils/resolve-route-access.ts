import type { Reflector } from '@nestjs/core';

import {
  IS_PUBLIC_KEY,
  ROLES_KEY,
} from '../../shared/constants/auth-metadata.constant.js';

import { isRoleList } from '../../shared/utils/authorization-validation.js';
import { readAuthorizationMetadata } from './read-authorization-metadata.js';

export function resolveRouteAccess(
  reflector: Reflector,
  controller: Function,
  handler: Function,
) {
  const targets = [handler, controller];
  const publicFlags = targets.map((target) =>
    readAuthorizationMetadata(
      reflector,
      IS_PUBLIC_KEY,
      target,
      (value): value is boolean => typeof value === 'boolean',
      target === handler
        ? `${controller.name}.${handler.name}`
        : controller.name,
    ),
  );
  const roleLists = targets.map((target) =>
    readAuthorizationMetadata(
      reflector,
      ROLES_KEY,
      target,
      isRoleList,
      target === handler
        ? `${controller.name}.${handler.name}`
        : controller.name,
    ),
  );
  return {
    isPublic: publicFlags[0] ?? publicFlags[1] ?? false,
    roles: roleLists[0] ?? roleLists[1],
  };
}

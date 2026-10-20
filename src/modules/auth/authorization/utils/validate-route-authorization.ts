import type { Reflector } from '@nestjs/core';

import {
  PERMISSIONS_KEY,
  POLICY_KEY,
} from '../constants/authorization-metadata.constant.js';

import { AuthorizationConfigurationException } from '../errors/authorization-configuration.exception.js';

import {
  isPermissionList,
  isPermissionPolicy,
} from './authorization-validation.js';

import { readAuthorizationMetadata } from './read-authorization-metadata.js';
import { resolveRouteAccess } from './resolve-route-access.js';
import { validatePermissionMethod } from './validate-permission-method.js';

export function validateRouteAuthorization(
  reflector: Reflector,
  controller: Function,
  handler: Function,
): void {
  const routeName = `${controller.name}.${handler.name}`;
  if (Reflect.hasMetadata(PERMISSIONS_KEY, controller)) {
    throw new AuthorizationConfigurationException(
      `${controller.name}: declare permissions on route methods.`,
    );
  }
  if (Reflect.hasMetadata(POLICY_KEY, handler)) {
    throw new AuthorizationConfigurationException(
      `${routeName}: declare policies on controllers.`,
    );
  }

  const policy = readAuthorizationMetadata(
    reflector,
    POLICY_KEY,
    controller,
    isPermissionPolicy,
  );
  const required = readAuthorizationMetadata(
    reflector,
    PERMISSIONS_KEY,
    handler,
    isPermissionList,
    routeName,
  );
  const { isPublic, roles } = resolveRouteAccess(
    reflector,
    controller,
    handler,
  );
  if (policy && !required && (!isPublic || roles)) {
    throw new AuthorizationConfigurationException(
      `${routeName} is missing required permissions.`,
    );
  }
  if (required && !policy) {
    throw new AuthorizationConfigurationException(
      `${routeName} has no permission policy.`,
    );
  }
  validatePermissionMethod(reflector, controller, handler, required);
}

import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import type { Reflector } from '@nestjs/core';
import { PERMISSION_METHOD_EXCEPTION_KEY } from '../../shared/constants/auth-metadata.constant.js';
import { Permission } from '../../shared/enums/permission.enum.js';
import { AuthorizationConfigurationException } from '../../shared/errors/authorization-configuration.exception.js';
import { readAuthorizationMetadata } from './read-authorization-metadata.js';

const HTTP_METHOD_PERMISSIONS: Partial<Record<RequestMethod, Permission>> = {
  [RequestMethod.GET]: Permission.READ,
  [RequestMethod.HEAD]: Permission.READ,
  [RequestMethod.POST]: Permission.CREATE,
  [RequestMethod.PUT]: Permission.UPDATE,
  [RequestMethod.PATCH]: Permission.UPDATE,
  [RequestMethod.DELETE]: Permission.DELETE,
};

function validateMethodException(
  controller: Function,
  handler: Function,
  reason: unknown,
  declared: readonly Permission[] | undefined,
): void {
  if (Reflect.hasMetadata(PERMISSION_METHOD_EXCEPTION_KEY, controller)) {
    throw new AuthorizationConfigurationException(
      `${controller.name}: declare permission method exceptions on route methods.`,
    );
  }
  if (!Reflect.hasMetadata(PERMISSION_METHOD_EXCEPTION_KEY, handler)) return;
  const routeName = `${controller.name}.${handler.name}`;
  if (typeof reason !== 'string' || !reason.trim()) {
    throw new AuthorizationConfigurationException(
      `${routeName}: permission method exceptions require a non-empty reason.`,
    );
  }
  if (!declared?.length) {
    throw new AuthorizationConfigurationException(
      `${routeName} has a permission method exception but no method permissions.`,
    );
  }
}

/** Startup-only convention check. Additional permissions remain valid requirements. */
export function validatePermissionMethod(
  reflector: Reflector,
  controller: Function,
  handler: Function,
  declared: readonly Permission[] | undefined,
): void {
  const reason = reflector.get<unknown>(
    PERMISSION_METHOD_EXCEPTION_KEY,
    handler,
  );
  validateMethodException(controller, handler, reason, declared);
  if (!declared?.length || !Reflect.hasMetadata(PATH_METADATA, handler)) return;

  const routeName = `${controller.name}.${handler.name}`;
  const method = readAuthorizationMetadata(
    reflector,
    METHOD_METADATA,
    handler,
    (value): value is RequestMethod =>
      typeof value === 'number' && typeof RequestMethod[value] === 'string',
    routeName,
  );
  if (method === undefined) {
    throw new AuthorizationConfigurationException(
      `${routeName} has no HTTP method metadata. Add an HTTP route decorator.`,
    );
  }
  if (reason !== undefined) return;

  const expected = HTTP_METHOD_PERMISSIONS[method];
  if (expected === undefined) {
    throw new AuthorizationConfigurationException(
      `${routeName} uses ${RequestMethod[method]}, which has no standard CRUD permission mapping. ` +
        'Document the operation with @AllowPermissionMethodMismatch("reason").',
    );
  }
  if (!declared.includes(expected)) {
    throw new AuthorizationConfigurationException(
      `${routeName} uses ${RequestMethod[method]} but does not declare Permission.${expected}. ` +
        `Add Permission.${expected} or document the operation with @AllowPermissionMethodMismatch("reason").`,
    );
  }
}

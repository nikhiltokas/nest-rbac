import 'reflect-metadata';
import { Get, Post, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NOTE_POLICY } from '../../../note/policy/note.policy.js';

import {
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
  POLICY_KEY,
  ROLES_KEY,
} from '../../shared/constants/auth-metadata.constant.js';

import { AllowPermissionMethodMismatch } from '../../shared/decorators/permission-method-exception.decorator.js';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Policy } from '../../shared/decorators/policy.decorator.js';
import { Public } from '../../shared/decorators/public.decorator.js';
import { Roles } from '../../shared/decorators/roles.decorator.js';
import { Permission } from '../../shared/enums/permission.enum.js';
import { AuthorizationConfigurationException } from '../../shared/errors/authorization-configuration.exception.js';
import { validateRouteAuthorization } from '../utils/validate-route-authorization.js';

describe('validateRouteAuthorization', () => {
  const reflector = new Reflector();

  function declaredRoute() {
    @Policy(NOTE_POLICY)
    class NotesController {
      @Get()
      @RequirePermissions(Permission.READ)
      list(this: void) {}
    }
    return {
      controller: NotesController,
      handler: NotesController.prototype.list,
    };
  }

  it('accepts explicit route permissions with a controller policy', () => {
    const { controller, handler } = declaredRoute();
    expect(() =>
      validateRouteAuthorization(reflector, controller, handler),
    ).not.toThrow();
  });

  it('requires permissions on protected policy routes', () => {
    const { controller, handler } = declaredRoute();
    Reflect.deleteMetadata(PERMISSIONS_KEY, handler);
    expect(() =>
      validateRouteAuthorization(reflector, controller, handler),
    ).toThrow(AuthorizationConfigurationException);
    expect(() =>
      validateRouteAuthorization(reflector, controller, handler),
    ).toThrow('NotesController.list is missing required permissions.');
  });

  it('requires a policy when method permissions are declared', () => {
    const { controller, handler } = declaredRoute();
    Reflect.deleteMetadata(POLICY_KEY, controller);
    expect(() =>
      validateRouteAuthorization(reflector, controller, handler),
    ).toThrow('NotesController.list has no permission policy.');
  });

  it.each(['controller', 'method'] as const)(
    'allows public access declared on the %s without permissions',
    (scope) => {
      const { controller, handler } = declaredRoute();
      Reflect.deleteMetadata(PERMISSIONS_KEY, handler);
      Reflect.defineMetadata(
        IS_PUBLIC_KEY,
        true,
        scope === 'controller' ? controller : handler,
      );
      expect(() =>
        validateRouteAuthorization(reflector, controller, handler),
      ).not.toThrow();
    },
  );

  it('requires permissions when a method overrides a public controller', () => {
    @Policy(NOTE_POLICY)
    @Public()
    class NotesController {
      @Get()
      @SetMetadata(IS_PUBLIC_KEY, false)
      list(this: void) {}
    }
    expect(() =>
      validateRouteAuthorization(
        reflector,
        NotesController,
        NotesController.prototype.list,
      ),
    ).toThrow('NotesController.list is missing required permissions.');
  });

  it.each(['controller', 'method'] as const)(
    'requires permissions when a public policy route also has %s roles',
    (scope) => {
      const { controller, handler } = declaredRoute();
      Reflect.deleteMetadata(PERMISSIONS_KEY, handler);
      Reflect.defineMetadata(IS_PUBLIC_KEY, true, controller);
      Reflect.defineMetadata(
        ROLES_KEY,
        [Roles.USER],
        scope === 'controller' ? controller : handler,
      );
      expect(() =>
        validateRouteAuthorization(reflector, controller, handler),
      ).toThrow('NotesController.list is missing required permissions.');
    },
  );

  it('allows authentication-only routes without a policy', () => {
    const { controller, handler } = declaredRoute();
    Reflect.deleteMetadata(POLICY_KEY, controller);
    Reflect.deleteMetadata(PERMISSIONS_KEY, handler);
    expect(() =>
      validateRouteAuthorization(reflector, controller, handler),
    ).not.toThrow();
  });

  it('allows role-only routes without a policy', () => {
    @Roles(Roles.USER)
    class ProfileController {
      @Get()
      profile(this: void) {}
    }
    expect(() =>
      validateRouteAuthorization(
        reflector,
        ProfileController,
        ProfileController.prototype.profile,
      ),
    ).not.toThrow();
  });

  it('rejects permissions placed on a controller', () => {
    const { controller, handler } = declaredRoute();
    Reflect.defineMetadata(PERMISSIONS_KEY, [Permission.READ], controller);
    expect(() =>
      validateRouteAuthorization(reflector, controller, handler),
    ).toThrow('NotesController: declare permissions on route methods.');
  });

  it('rejects policies placed on a method', () => {
    const { controller, handler } = declaredRoute();
    Reflect.defineMetadata(POLICY_KEY, NOTE_POLICY, handler);
    expect(() =>
      validateRouteAuthorization(reflector, controller, handler),
    ).toThrow('NotesController.list: declare policies on controllers.');
  });

  it.each([
    { key: POLICY_KEY, value: undefined },
    { key: POLICY_KEY, value: {} },
    { key: POLICY_KEY, value: { ...NOTE_POLICY, USER: ['UNKNOWN'] } },
    { key: ROLES_KEY, value: [] },
    { key: ROLES_KEY, value: ['UNKNOWN'] },
    { key: IS_PUBLIC_KEY, value: 'true' },
  ])('rejects invalid controller $key metadata', ({ key, value }) => {
    const { controller, handler } = declaredRoute();
    Reflect.defineMetadata(key, value, controller);
    expect(() =>
      validateRouteAuthorization(reflector, controller, handler),
    ).toThrow(`NotesController has invalid ${key} metadata.`);
  });

  it.each([
    { key: PERMISSIONS_KEY, value: undefined },
    { key: PERMISSIONS_KEY, value: [] },
    { key: PERMISSIONS_KEY, value: ['UNKNOWN'] },
    { key: PERMISSIONS_KEY, value: Array(1) },
    { key: ROLES_KEY, value: [] },
    { key: ROLES_KEY, value: ['UNKNOWN'] },
    { key: IS_PUBLIC_KEY, value: null },
  ])('rejects invalid method $key metadata', ({ key, value }) => {
    const { controller, handler } = declaredRoute();
    Reflect.defineMetadata(key, value, handler);
    expect(() =>
      validateRouteAuthorization(reflector, controller, handler),
    ).toThrow(`NotesController.list has invalid ${key} metadata.`);
  });

  it('accepts inherited controller policies and method permissions', () => {
    const { controller: BaseController } = declaredRoute();
    class NotesController extends BaseController {}
    expect(() =>
      validateRouteAuthorization(
        reflector,
        NotesController,
        NotesController.prototype.list,
      ),
    ).not.toThrow();
  });

  it('rejects a POST read operation without a documented exception', () => {
    @Policy(NOTE_POLICY)
    class NotesController {
      @Post('by-ids')
      @RequirePermissions(Permission.READ)
      read(this: void) {}
    }
    expect(() =>
      validateRouteAuthorization(
        reflector,
        NotesController,
        NotesController.prototype.read,
      ),
    ).toThrow(
      'NotesController.read uses POST but does not declare Permission.CREATE.',
    );
  });

  it('accepts a POST read operation with a documented exception', () => {
    @Policy(NOTE_POLICY)
    class NotesController {
      @Post('by-ids')
      @RequirePermissions(Permission.READ)
      @AllowPermissionMethodMismatch(
        'Reads notes selected by IDs in the request body.',
      )
      read(this: void) {}
    }
    expect(() =>
      validateRouteAuthorization(
        reflector,
        NotesController,
        NotesController.prototype.read,
      ),
    ).not.toThrow();
  });

  it('does not let a mismatch exception bypass the policy requirement', () => {
    class NotesController {
      @Post('by-ids')
      @RequirePermissions(Permission.READ)
      @AllowPermissionMethodMismatch(
        'Reads notes selected by IDs in the request body.',
      )
      read(this: void) {}
    }
    expect(() =>
      validateRouteAuthorization(
        reflector,
        NotesController,
        NotesController.prototype.read,
      ),
    ).toThrow('NotesController.read has no permission policy.');
  });

  it('rejects an exception without permissions even on a public route', () => {
    class NotesController {
      @Get()
      @Public()
      @AllowPermissionMethodMismatch('This route is public.')
      list(this: void) {}
    }
    expect(() =>
      validateRouteAuthorization(
        reflector,
        NotesController,
        NotesController.prototype.list,
      ),
    ).toThrow(
      'NotesController.list has a permission method exception but no method permissions.',
    );
  });
});

import 'reflect-metadata';
import { SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../constants/authorization-metadata.constant.js';
import { IS_PUBLIC_KEY } from '../../shared/constants/auth-metadata.constant.js';
import { Public } from '../../shared/decorators/public.decorator.js';
import { Roles } from '../decorators/roles.decorator.js';
import { AuthorizationConfigurationException } from '../errors/authorization-configuration.exception.js';
import { resolveRouteAccess } from '../utils/resolve-route-access.js';

describe('resolveRouteAccess', () => {
  const reflector = new Reflector();

  it('defaults to authenticated access without role restrictions', () => {
    class Controller {
      route(this: void) {}
    }
    expect(
      resolveRouteAccess(reflector, Controller, Controller.prototype.route),
    ).toEqual({
      isPublic: false,
      roles: undefined,
    });
  });

  it('inherits controller declarations', () => {
    @Public()
    @Roles(Roles.MODERATOR)
    class Controller {
      route(this: void) {}
    }
    expect(
      resolveRouteAccess(reflector, Controller, Controller.prototype.route),
    ).toEqual({
      isPublic: true,
      roles: [Roles.MODERATOR],
    });
  });

  it('lets method declarations override controller declarations', () => {
    @Public()
    @Roles(Roles.MODERATOR)
    class Controller {
      @SetMetadata(IS_PUBLIC_KEY, false)
      @Roles(Roles.SUPER_ADMIN, Roles.USER)
      route(this: void) {}
    }
    expect(
      resolveRouteAccess(reflector, Controller, Controller.prototype.route),
    ).toEqual({
      isPublic: false,
      roles: [Roles.SUPER_ADMIN, Roles.USER],
    });
  });

  it('allows a method to be public inside an authenticated controller', () => {
    class Controller {
      @Public()
      route(this: void) {}
    }
    expect(
      resolveRouteAccess(reflector, Controller, Controller.prototype.route)
        .isPublic,
    ).toBe(true);
  });

  it.each([
    { key: IS_PUBLIC_KEY, value: undefined },
    { key: IS_PUBLIC_KEY, value: 'true' },
    { key: ROLES_KEY, value: [] },
    { key: ROLES_KEY, value: ['UNKNOWN'] },
  ])('rejects invalid $key metadata on either target', ({ key, value }) => {
    for (const targetName of ['controller', 'method']) {
      class Controller {
        route(this: void) {}
      }
      const target =
        targetName === 'controller' ? Controller : Controller.prototype.route;
      Reflect.defineMetadata(key, value, target);
      expect(() =>
        resolveRouteAccess(reflector, Controller, Controller.prototype.route),
      ).toThrow(AuthorizationConfigurationException);
    }
  });

  it('validates controller metadata even when a method overrides it', () => {
    @SetMetadata(ROLES_KEY, [])
    class Controller {
      @Roles(Roles.USER)
      route(this: void) {}
    }
    expect(() =>
      resolveRouteAccess(reflector, Controller, Controller.prototype.route),
    ).toThrow('Controller has invalid roles metadata.');
  });
});

import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Roles } from '../decorators/roles.decorator.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { httpContext } from '../../../../shared/tests/helpers/http-context.js';

describe('Roles decorator and guard', () => {
  const guard = new RolesGuard(new Reflector());

  @Roles(Roles.MODERATOR)
  class Controller {
    route(this: void) {}

    @Roles(Roles.SUPER_ADMIN, Roles.USER)
    override(this: void) {}
  }

  it('allows routes without role restrictions', () => {
    expect(guard.canActivate(httpContext({}))).toBe(true);
  });

  it('attaches the role guard when the decorator is used', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, Controller)).toContain(
      RolesGuard,
    );
    expect(
      Reflect.getMetadata(GUARDS_METADATA, Controller.prototype.override),
    ).toContain(RolesGuard);
  });

  it('allows the role declared on the controller', () => {
    expect(
      guard.canActivate(
        httpContext(
          { user: { role: 'MODERATOR' } },
          Controller.prototype.route,
          Controller,
        ),
      ),
    ).toBe(true);
  });

  it('denies a different role', () => {
    expect(
      guard.canActivate(
        httpContext(
          { user: { role: 'USER' } },
          Controller.prototype.route,
          Controller,
        ),
      ),
    ).toBe(false);
  });

  it('denies a restricted route without an authenticated identity', () => {
    expect(
      guard.canActivate(
        httpContext({}, Controller.prototype.route, Controller),
      ),
    ).toBe(false);
  });

  it.each(['SUPER_ADMIN', 'USER'])('allows any listed method role', (role) => {
    expect(
      guard.canActivate(
        httpContext(
          { user: { role } },
          Controller.prototype.override,
          Controller,
        ),
      ),
    ).toBe(true);
  });

  it('lets method roles override the controller roles', () => {
    expect(
      guard.canActivate(
        httpContext(
          { user: { role: 'MODERATOR' } },
          Controller.prototype.override,
          Controller,
        ),
      ),
    ).toBe(false);
  });

  it.each(['UNKNOWN', 'toString', 'constructor', '__proto__', undefined])(
    'denies an invalid runtime role %s',
    (role) => {
      expect(
        guard.canActivate(
          httpContext(
            { user: { role } },
            Controller.prototype.route,
            Controller,
          ),
        ),
      ).toBe(false);
    },
  );
});

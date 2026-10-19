import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { COMMENT_POLICY } from '../../../comment/policy/comment.policy.js';
import { NOTE_POLICY } from '../../../note/policy/note.policy.js';
import type { UserRole } from '../../shared/contracts/user-role.type.js';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Public } from '../../shared/decorators/public.decorator.js';
import { Roles } from '../../shared/decorators/roles.decorator.js';
import { Policy } from '../../shared/decorators/policy.decorator.js';
import { Permission } from '../../shared/enums/permission.enum.js';
import { PermissionsGuard } from '../guards/permissions.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { httpContext } from './helpers/http-context.js';

describe('RequirePermissions and PermissionsGuard', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);

  @Policy(NOTE_POLICY)
  @RequirePermissions(Permission.READ)
  class Controller {
    route(this: void) {}

    @RequirePermissions(Permission.UPDATE)
    moderate(this: void) {}

    @RequirePermissions(Permission.CREATE, Permission.DELETE)
    admin(this: void) {}
  }

  function context(role: string, handler = Controller.prototype.route) {
    return httpContext({ user: { role } }, handler, Controller);
  }

  it('leaves routes without permissions to the authentication guard', () => {
    expect(guard.canActivate(httpContext({}))).toBe(true);
  });

  it('requires an authenticated user on a restricted route', () => {
    expect(() =>
      guard.canActivate(
        httpContext({}, Controller.prototype.route, Controller),
      ),
    ).toThrow('No authenticated user found');
  });

  it.each<UserRole>(['USER', 'MODERATOR', 'SUPER_ADMIN'])(
    'allows the controller permission for %s',
    (role) => {
      expect(guard.canActivate(context(role))).toBe(true);
    },
  );

  it('denies a user without the additional method permission', () => {
    expect(() =>
      guard.canActivate(context('USER', Controller.prototype.moderate)),
    ).toThrow('Missing permissions: UPDATE');
  });

  it('allows a moderator with both controller and method permissions', () => {
    expect(
      guard.canActivate(context('MODERATOR', Controller.prototype.moderate)),
    ).toBe(true);
  });

  it('requires every permission, even if some of them are granted', () => {
    expect(() =>
      guard.canActivate(context('MODERATOR', Controller.prototype.admin)),
    ).toThrow('Missing permissions: DELETE');
  });

  it('does not let method permissions replace controller requirements', () => {
    @Policy(NOTE_POLICY)
    @RequirePermissions(Permission.UPDATE)
    class AdminController {
      @RequirePermissions(Permission.READ)
      route(this: void) {}
    }
    expect(() =>
      guard.canActivate(
        httpContext(
          { user: { role: 'USER' } },
          AdminController.prototype.route,
          AdminController,
        ),
      ),
    ).toThrow('Missing permissions: UPDATE');
  });

  it('grants super admins all declared permissions', () => {
    expect(
      guard.canActivate(context('SUPER_ADMIN', Controller.prototype.admin)),
    ).toBe(true);
  });

  it.each(['UNKNOWN', 'toString', 'constructor', '__proto__'])(
    'denies an invalid runtime role %s',
    (role) => {
      expect(() => guard.canActivate(context(role))).toThrow(
        ForbiddenException,
      );
    },
  );

  it('does not let Public bypass an explicit permission requirement', () => {
    @Policy(NOTE_POLICY)
    class PublicController {
      @Public()
      @RequirePermissions(Permission.CREATE)
      route(this: void) {}
    }
    expect(() =>
      guard.canActivate(
        httpContext({}, PublicController.prototype.route, PublicController),
      ),
    ).toThrow(ForbiddenException);
  });

  it('requires role and permission checks to pass when both are declared', () => {
    @Policy(COMMENT_POLICY)
    class RestrictedController {
      @Roles(Roles.SUPER_ADMIN)
      @RequirePermissions(Permission.UPDATE)
      route(this: void) {}
    }
    const restricted = httpContext(
      { user: { role: 'MODERATOR' } },
      RestrictedController.prototype.route,
      RestrictedController,
    );
    expect(guard.canActivate(restricted)).toBe(true);
    expect(new RolesGuard(reflector).canActivate(restricted)).toBe(false);
  });

  it('denies a permission requirement when no policy is configured', () => {
    class MissingPolicyController {
      @RequirePermissions(Permission.READ)
      route(this: void) {}
    }
    expect(() =>
      guard.canActivate(
        httpContext(
          { user: { role: 'SUPER_ADMIN' } },
          MissingPolicyController.prototype.route,
          MissingPolicyController,
        ),
      ),
    ).toThrow('No permission policy configured');
  });

  it('checks the same action against each controllers own policy', () => {
    @Policy({
      ...COMMENT_POLICY,
      MODERATOR: [...COMMENT_POLICY.MODERATOR, Permission.DELETE],
    })
    class ModeratedController {
      @RequirePermissions(Permission.DELETE)
      remove(this: void) {}
    }
    expect(
      guard.canActivate(
        httpContext(
          { user: { role: 'MODERATOR' } },
          ModeratedController.prototype.remove,
          ModeratedController,
        ),
      ),
    ).toBe(true);
    expect(() =>
      guard.canActivate(context('MODERATOR', Controller.prototype.admin)),
    ).toThrow('Missing permissions: DELETE');
    expect(COMMENT_POLICY.MODERATOR).not.toContain(Permission.DELETE);
  });

  it('uses the policy even for super admins instead of assuming a bypass', () => {
    @Policy({ ...NOTE_POLICY, SUPER_ADMIN: [] })
    class RestrictedAdminController {
      @RequirePermissions(Permission.DELETE)
      remove(this: void) {}
    }
    expect(() =>
      guard.canActivate(
        httpContext(
          { user: { role: 'SUPER_ADMIN' } },
          RestrictedAdminController.prototype.remove,
          RestrictedAdminController,
        ),
      ),
    ).toThrow('Missing permissions: DELETE');
  });
});

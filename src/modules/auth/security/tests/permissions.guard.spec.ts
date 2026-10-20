import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { COMMENT_POLICY } from '../../../comment/policy/comment.policy.js';
import { POLICY_KEY } from '../../shared/constants/auth-metadata.constant.js';
import type { PermissionPolicy } from '../../shared/contracts/permission-policy.type.js';
import type { UserRole } from '../../shared/contracts/user-role.type.js';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Public } from '../../shared/decorators/public.decorator.js';
import { Roles } from '../../shared/decorators/roles.decorator.js';
import { Policy } from '../../shared/decorators/policy.decorator.js';
import { Permission } from '../../shared/enums/permission.enum.js';
import { PermissionsGuard } from '../guards/permissions.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { httpContext } from './helpers/http-context.js';

const TEST_POLICY = {
  SUPER_ADMIN: Object.values(Permission),
  MODERATOR: [Permission.CREATE, Permission.READ, Permission.UPDATE],
  USER: [Permission.READ],
} satisfies PermissionPolicy;

const ADMIN_POLICY: PermissionPolicy = {
  SUPER_ADMIN: [Permission.READ, Permission.DELETE],
};

const MULTI_ROLE_POLICY: PermissionPolicy = {
  SUPER_ADMIN: [Permission.READ, Permission.DELETE],
  MODERATOR: [Permission.READ],
};

describe('RequirePermissions and PermissionsGuard', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);

  @Policy(TEST_POLICY)
  class Controller {
    @RequirePermissions(Permission.READ)
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
    'allows the declared permission for %s',
    (role) => {
      expect(guard.canActivate(context(role))).toBe(true);
    },
  );

  it('denies a user without the required method permission', () => {
    expect(() =>
      guard.canActivate(context('USER', Controller.prototype.moderate)),
    ).toThrow('Missing permissions: UPDATE');
  });

  it('allows a moderator with the required method permission', () => {
    expect(
      guard.canActivate(context('MODERATOR', Controller.prototype.moderate)),
    ).toBe(true);
  });

  it('requires every permission, even if some of them are granted', () => {
    expect(() =>
      guard.canActivate(context('MODERATOR', Controller.prototype.admin)),
    ).toThrow('Missing permissions: DELETE');
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
    @Policy(TEST_POLICY)
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
    @Policy(TEST_POLICY)
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

  it('checks the same action against each controllers own policy', () => {
    const MODERATED_POLICY: PermissionPolicy = {
      ...TEST_POLICY,
      MODERATOR: [...TEST_POLICY.MODERATOR, Permission.DELETE],
    };
    @Policy(MODERATED_POLICY)
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
    expect(TEST_POLICY.MODERATOR).not.toContain(Permission.DELETE);
  });

  it('uses the policy even for super admins instead of assuming a bypass', () => {
    const RESTRICTED_ADMIN_POLICY: PermissionPolicy = {
      ...TEST_POLICY,
      SUPER_ADMIN: [],
    };
    @Policy(RESTRICTED_ADMIN_POLICY)
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

  describe.each([
    {
      name: 'moderator-only',
      policy: COMMENT_POLICY,
      readers: ['MODERATOR'],
      deleters: ['MODERATOR'],
    },
    {
      name: 'admin-only',
      policy: ADMIN_POLICY,
      readers: ['SUPER_ADMIN'],
      deleters: ['SUPER_ADMIN'],
    },
    {
      name: 'multi-role',
      policy: MULTI_ROLE_POLICY,
      readers: ['SUPER_ADMIN', 'MODERATOR'],
      deleters: ['SUPER_ADMIN'],
    },
  ])('$name named policy', ({ policy, readers, deleters }) => {
    @Policy(policy)
    class NamedPolicyController {
      @RequirePermissions(Permission.READ)
      read(this: void) {}

      @RequirePermissions(Permission.DELETE)
      remove(this: void) {}
    }

    it('references the policy definition directly', () => {
      expect(reflector.get(POLICY_KEY, NamedPolicyController)).toBe(policy);
    });

    it.each<UserRole>(['SUPER_ADMIN', 'MODERATOR', 'USER'])(
      'enforces the declared permissions for %s',
      (role) => {
        for (const [handler, allowed] of [
          [NamedPolicyController.prototype.read, readers],
          [NamedPolicyController.prototype.remove, deleters],
        ] as const) {
          const check = () =>
            guard.canActivate(
              httpContext({ user: { role } }, handler, NamedPolicyController),
            );
          if (allowed.includes(role)) {
            expect(check()).toBe(true);
          } else {
            expect(check).toThrow(ForbiddenException);
          }
        }
      },
    );
  });
});

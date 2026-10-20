import { ForbiddenException } from '@nestjs/common';
import type { PermissionPolicy } from '../contracts/permission-policy.type.js';
import type { UserRole } from '../contracts/user-role.type.js';
import { Permission } from '../enums/permission.enum.js';
import { assertPermissions } from '../utils/permissions.js';

describe('assertPermissions', () => {
  const policy: PermissionPolicy = {
    SUPER_ADMIN: [Permission.READ],
    MODERATOR: [Permission.READ, Permission.UPDATE],
    USER: [],
  };

  it('allows a role that holds every required action', () => {
    expect(() =>
      assertPermissions(
        policy,
        'MODERATOR',
        Permission.READ,
        Permission.UPDATE,
      ),
    ).not.toThrow();
  });

  it('reports only the missing actions', () => {
    expect(() =>
      assertPermissions(
        policy,
        'MODERATOR',
        Permission.READ,
        Permission.CREATE,
        Permission.DELETE,
      ),
    ).toThrow('Missing permissions: CREATE, DELETE');
  });

  it('denies a role with no grants', () => {
    expect(() => assertPermissions(policy, 'USER', Permission.READ)).toThrow(
      ForbiddenException,
    );
  });

  it.each<UserRole>(['USER', 'SUPER_ADMIN'])(
    'denies omitted role %s in a moderator-only policy',
    (role) => {
      const moderatorPolicy: PermissionPolicy = {
        MODERATOR: [Permission.READ, Permission.DELETE],
      };
      expect(() =>
        assertPermissions(moderatorPolicy, 'MODERATOR', Permission.DELETE),
      ).not.toThrow();
      expect(() =>
        assertPermissions(moderatorPolicy, role, Permission.READ),
      ).toThrow(ForbiddenException);
      expect(Object.keys(moderatorPolicy)).toEqual(['MODERATOR']);
    },
  );

  it('requires explicit grants for super admins', () => {
    expect(() =>
      assertPermissions(policy, 'SUPER_ADMIN', Permission.DELETE),
    ).toThrow(ForbiddenException);
  });

  it.each(['UNKNOWN', 'toString', 'constructor', '__proto__'])(
    'denies an unknown role without using prototype properties: %s',
    (role) => {
      expect(() =>
        assertPermissions(policy, role as UserRole, Permission.READ),
      ).toThrow(ForbiddenException);
    },
  );

  it('does not modify the policy while checking permissions', () => {
    const frozen: PermissionPolicy = Object.freeze({
      SUPER_ADMIN: Object.freeze([Permission.READ]),
      MODERATOR: Object.freeze([Permission.UPDATE]),
      USER: Object.freeze([]),
    });
    assertPermissions(frozen, 'MODERATOR', Permission.UPDATE);
    expect(frozen.MODERATOR).toEqual([Permission.UPDATE]);
  });
});

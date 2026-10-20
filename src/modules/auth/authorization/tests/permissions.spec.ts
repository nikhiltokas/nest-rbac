import { Permission } from '../constants/permission.constant.js';
import { ForbiddenException } from '@nestjs/common';
import type { PermissionPolicy } from '../contracts/permission-policy.type.js';
import type { UserRole } from '../contracts/user-role.type.js';
import { Permissions } from '../enums/permissions.enum.js';
import { assertPermissions } from '../utils/permissions.js';

describe('assertPermissions', () => {
  const policy: PermissionPolicy = {
    SUPER_ADMIN: [Permission.READ.ANY],
    MODERATOR: [Permission.READ.ANY, Permission.UPDATE.ANY],
    USER: [],
  };

  it('allows a role that holds every required action', () => {
    expect(() =>
      assertPermissions(
        policy,
        'MODERATOR',
        Permissions.READ,
        Permissions.UPDATE,
      ),
    ).not.toThrow();
  });

  it('reports only the missing actions', () => {
    expect(() =>
      assertPermissions(
        policy,
        'MODERATOR',
        Permissions.READ,
        Permissions.CREATE,
        Permissions.DELETE,
      ),
    ).toThrow('Missing permissions: CREATE, DELETE');
  });

  it('denies a role with no grants', () => {
    expect(() => assertPermissions(policy, 'USER', Permissions.READ)).toThrow(
      ForbiddenException,
    );
  });

  it.each<UserRole>(['USER', 'SUPER_ADMIN'])(
    'denies omitted role %s in a moderator-only policy',
    (role) => {
      const moderatorPolicy: PermissionPolicy = {
        MODERATOR: [Permission.READ.ANY, Permission.DELETE.ANY],
      };
      expect(() =>
        assertPermissions(moderatorPolicy, 'MODERATOR', Permissions.DELETE),
      ).not.toThrow();
      expect(() =>
        assertPermissions(moderatorPolicy, role, Permissions.READ),
      ).toThrow(ForbiddenException);
      expect(Object.keys(moderatorPolicy)).toEqual(['MODERATOR']);
    },
  );

  it('requires explicit grants for super admins', () => {
    expect(() =>
      assertPermissions(policy, 'SUPER_ADMIN', Permissions.DELETE),
    ).toThrow(ForbiddenException);
  });

  it.each(['UNKNOWN', 'toString', 'constructor', '__proto__'])(
    'denies an unknown role without using prototype properties: %s',
    (role) => {
      expect(() =>
        assertPermissions(policy, role as UserRole, Permissions.READ),
      ).toThrow(ForbiddenException);
    },
  );

  it('does not modify the policy while checking permissions', () => {
    const frozen: PermissionPolicy = Object.freeze({
      SUPER_ADMIN: Object.freeze([Permission.READ.ANY]),
      MODERATOR: Object.freeze([Permission.UPDATE.ANY]),
      USER: Object.freeze([]),
    });
    assertPermissions(frozen, 'MODERATOR', Permissions.UPDATE);
    expect(frozen.MODERATOR).toEqual([Permission.UPDATE.ANY]);
  });
});

import { Permission } from '../constants/permission.constant.js';
import { Role } from '../constants/role.constant.js';
import { Permissions } from '../enums/permissions.enum.js';
import { AccessScope } from '../enums/access-scope.enum.js';

import {
  isPermissionList,
  isPermissionPolicy,
  isRoleList,
} from '../utils/authorization-validation.js';

describe('authorization metadata validation', () => {
  describe('permission lists', () => {
    it('accepts a non-empty list of known actions', () => {
      expect(isPermissionList(Object.values(Permissions))).toBe(true);
    });

    it.each(
      [
        undefined,
        null,
        Permissions.READ,
        {},
        [],
        ['UNKNOWN'],
        [Permissions.READ, 'UNKNOWN'],
        [Permission.READ.OWN],
        [undefined],
        Array(1),
      ].map((value) => ({ value })),
    )('rejects invalid permissions: $value', ({ value }) => {
      expect(isPermissionList(value)).toBe(false);
    });
  });

  describe('role lists', () => {
    it('accepts a non-empty list of known roles', () => {
      expect(isRoleList(Object.values(Role))).toBe(true);
    });

    it.each(
      [
        undefined,
        null,
        Role.USER,
        {},
        [],
        ['UNKNOWN'],
        [Role.USER, 'UNKNOWN'],
        ['toString'],
        ['constructor'],
        ['__proto__'],
        [undefined],
        Array(1),
      ].map((value) => ({ value })),
    )('rejects invalid roles: $value', ({ value }) => {
      expect(isRoleList(value)).toBe(false);
    });
  });

  describe('permission policies', () => {
    const policy = {
      SUPER_ADMIN: [Permission.CREATE.ANY, Permission.DELETE.ANY],
      MODERATOR: [Permission.READ.ANY, Permission.UPDATE.ANY],
      USER: [],
    };

    it('accepts explicit grants for every role, including empty grants', () => {
      expect(isPermissionPolicy(policy)).toBe(true);
    });

    it.each([
      { MODERATOR: [Permission.READ.ANY, Permission.DELETE.ANY] },
      { SUPER_ADMIN: [Permission.CREATE.ANY] },
      {
        SUPER_ADMIN: [Permission.DELETE.ANY],
        MODERATOR: [Permission.READ.ANY],
      },
      { MODERATOR: [], USER: [] },
      { USER: [] },
    ])('accepts partial policies: %o', (partial) => {
      expect(isPermissionPolicy(partial)).toBe(true);
    });

    it('accepts a frozen policy without modifying its grants', () => {
      const frozen = Object.freeze({
        SUPER_ADMIN: Object.freeze([Permission.READ.ANY]),
        MODERATOR: Object.freeze([]),
        USER: Object.freeze([]),
      });
      expect(isPermissionPolicy(frozen)).toBe(true);
      expect(frozen.SUPER_ADMIN).toEqual([Permission.READ.ANY]);
    });

    it.each(
      [
        undefined,
        null,
        [],
        'policy',
        {},
        { UNKNOWN: [] },
        { toString: [] },
        { constructor: [] },
        { ['__proto__']: [] },
        { MODERATOR: undefined },
        { MODERATOR: null },
        { MODERATOR: Permissions.READ },
        { MODERATOR: ['UNKNOWN'] },
        { MODERATOR: Array(1) },
        { USER: [Permissions.READ] },
        { USER: [null] },
        { USER: [{}] },
        { USER: [{ action: Permissions.READ }] },
        { USER: [{ scope: AccessScope.ANY }] },
        { USER: [{ action: 'UNKNOWN', scope: AccessScope.ANY }] },
        { USER: [{ action: Permissions.READ, scope: 'UNKNOWN' }] },
        { USER: [{ action: Permissions.READ, scope: undefined }] },
        { USER: [{ action: Permissions.READ, scope: null }] },
        { USER: [{ ...Permission.READ.ANY, unexpected: true }] },
        { USER: [{ ...Permission.READ.ANY, [Symbol('extra')]: true }] },
        { USER: [Object.create(Permission.READ.ANY)] },
        {
          USER: [
            Object.assign(Object.create({ action: Permissions.READ }), {
              scope: AccessScope.ANY,
            }),
          ],
        },
        {
          USER: [
            Object.assign(Object.create({ scope: AccessScope.ANY }), {
              action: Permissions.READ,
            }),
          ],
        },
        {
          USER: [
            Object.defineProperty({ action: Permissions.READ }, 'scope', {
              get: () => AccessScope.ANY,
            }),
          ],
        },
        Object.defineProperty({}, 'USER', { get: () => [Permission.READ.ANY] }),
        { SUPER_ADMIN: [], MODERATOR: [], UNKNOWN: [] },
        { ...policy, UNKNOWN: [] },
        { ...policy, USER: undefined },
        { ...policy, USER: Permissions.READ },
        { ...policy, USER: ['UNKNOWN'] },
        { ...policy, USER: [Permission.READ.ANY, null] },
        { ...policy, USER: Array(1) },
        { ...policy, [Symbol('hidden')]: [] },
        Object.create(policy),
      ].map((value) => ({ value })),
    )('rejects malformed policies: $value', ({ value }) => {
      expect(isPermissionPolicy(value)).toBe(false);
    });

    it('rejects sparse arrays even if their prototype supplies a grant', () => {
      const grants = Array(1);
      Object.setPrototypeOf(grants, { 0: Permission.READ.ANY });
      expect(isPermissionPolicy({ USER: grants })).toBe(false);
    });
  });
});

import { Role } from '../constants/role.constant.js';
import { Permission } from '../enums/permission.enum.js';

import {
  isPermissionList,
  isPermissionPolicy,
  isRoleList,
} from '../utils/authorization-validation.js';

describe('authorization metadata validation', () => {
  describe('permission lists', () => {
    it('accepts a non-empty list of known actions', () => {
      expect(isPermissionList(Object.values(Permission))).toBe(true);
    });

    it.each(
      [
        undefined,
        null,
        Permission.READ,
        {},
        [],
        ['UNKNOWN'],
        [Permission.READ, 'UNKNOWN'],
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
      SUPER_ADMIN: [Permission.CREATE, Permission.DELETE],
      MODERATOR: [Permission.READ, Permission.UPDATE],
      USER: [],
    };

    it('accepts explicit grants for every role, including empty grants', () => {
      expect(isPermissionPolicy(policy)).toBe(true);
    });

    it('accepts a frozen policy without modifying its grants', () => {
      const frozen = Object.freeze({
        SUPER_ADMIN: Object.freeze([Permission.READ]),
        MODERATOR: Object.freeze([]),
        USER: Object.freeze([]),
      });
      expect(isPermissionPolicy(frozen)).toBe(true);
      expect(frozen.SUPER_ADMIN).toEqual([Permission.READ]);
    });

    it.each(
      [
        undefined,
        null,
        [],
        'policy',
        {},
        { MODERATOR: [], USER: [] },
        { SUPER_ADMIN: [], MODERATOR: [], UNKNOWN: [] },
        { ...policy, UNKNOWN: [] },
        { ...policy, USER: undefined },
        { ...policy, USER: Permission.READ },
        { ...policy, USER: ['UNKNOWN'] },
        { ...policy, USER: [Permission.READ, null] },
        { ...policy, USER: Array(1) },
        { ...policy, [Symbol('hidden')]: [] },
        Object.create(policy),
      ].map((value) => ({ value })),
    )('rejects malformed policies: $value', ({ value }) => {
      expect(isPermissionPolicy(value)).toBe(false);
    });
  });
});

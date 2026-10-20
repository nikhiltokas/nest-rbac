import { Permission } from '../constants/permission.constant.js';
import type { PermissionGrant } from '../contracts/permission-grant.type.js';
import type { PermissionPolicy } from '../contracts/permission-policy.type.js';
import type { UserRole } from '../contracts/user-role.type.js';
import { Permissions } from '../enums/permissions.enum.js';
import { AccessScope } from '../enums/access-scope.enum.js';
import { evaluatePolicy } from '../utils/evaluate-policy.js';

describe('evaluatePolicy', () => {
  it.each(Object.values(Permissions))(
    'resolves either scope for %s by value',
    (action) => {
      for (const scope of Object.values(AccessScope)) {
        const policy: PermissionPolicy = { USER: [{ action, scope }] };
        expect(evaluatePolicy(policy, 'USER', action)).toBe(scope);
      }
    },
  );

  it.each([
    [Permission.DELETE.OWN, Permission.DELETE.ANY],
    [Permission.DELETE.ANY, Permission.DELETE.OWN],
    [Permission.DELETE.OWN, Permission.DELETE.OWN, Permission.DELETE.ANY],
  ])('lets ANY win regardless of order or duplicates: %o', (...grants) => {
    expect(evaluatePolicy({ USER: grants }, 'USER', Permissions.DELETE)).toBe(
      AccessScope.ANY,
    );
  });

  it('accepts identical grants without relying on object identity', () => {
    const policy: PermissionPolicy = {
      USER: [{ ...Permission.DELETE.OWN }, { ...Permission.DELETE.OWN }],
    };
    expect(evaluatePolicy(policy, 'USER', Permissions.DELETE)).toBe(
      AccessScope.OWN,
    );
  });

  it('denies missing actions and omitted roles without inheritance or an admin bypass', () => {
    const policy: PermissionPolicy = {
      MODERATOR: [Permission.DELETE.ANY],
      SUPER_ADMIN: [Permission.READ.OWN],
    };
    expect(evaluatePolicy(policy, 'USER', Permissions.DELETE)).toBeUndefined();
    expect(
      evaluatePolicy(policy, 'MODERATOR', Permissions.UPDATE),
    ).toBeUndefined();
    expect(
      evaluatePolicy(policy, 'SUPER_ADMIN', Permissions.DELETE),
    ).toBeUndefined();
  });

  it.each(['UNKNOWN', 'toString', 'constructor', '__proto__'])(
    'denies unknown runtime role %s',
    (role) => {
      expect(
        evaluatePolicy(
          { USER: [Permission.DELETE.ANY] },
          role as UserRole,
          Permissions.DELETE,
        ),
      ).toBeUndefined();
    },
  );

  it('ignores inherited role definitions', () => {
    const policy: PermissionPolicy = Object.assign(
      Object.create({ USER: [Permission.DELETE.ANY] }),
      { MODERATOR: [Permission.READ.OWN] },
    );
    expect(evaluatePolicy(policy, 'USER', Permissions.DELETE)).toBeUndefined();
  });

  it('does not change readonly policies or grants', () => {
    const grant = Object.freeze({ ...Permission.DELETE.OWN });
    const policy = Object.freeze({ USER: Object.freeze([grant]) });
    expect(evaluatePolicy(policy, 'USER', Permissions.DELETE)).toBe(
      AccessScope.OWN,
    );
    expect(policy.USER).toEqual([Permission.DELETE.OWN]);
  });

  it('separates actions from grants at compile time', () => {
    const grant: PermissionGrant = Permission.DELETE.OWN;
    expect(grant).toEqual({
      action: Permissions.DELETE,
      scope: AccessScope.OWN,
    });
    // @ts-expect-error Actions must be registered in Permissions.
    const invalidPermission: Permissions = 'PUBLISH';
    const invalidScope: PermissionGrant = {
      action: Permissions.DELETE,
      // @ts-expect-error Scope strings cannot bypass AccessScope.
      scope: 'global',
    };
    // @ts-expect-error An action is not a scoped grant.
    const unscoped: PermissionGrant = Permissions.DELETE;
    // @ts-expect-error Policies contain grants, not actions.
    const invalidPolicy: PermissionPolicy = { USER: [Permissions.DELETE] };
    // @ts-expect-error Grants cannot be supplied as route actions.
    const scopedPermission: Permissions = Permission.DELETE.OWN;
    // @ts-expect-error New roles must first be registered in UserRole.
    const unknownRole: PermissionPolicy = { EDITOR: [Permission.UPDATE.OWN] };
    void [
      invalidPermission,
      invalidScope,
      unscoped,
      invalidPolicy,
      scopedPermission,
      unknownRole,
    ];
  });
});

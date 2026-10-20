import { ForbiddenException } from '@nestjs/common';
import { Permission } from '../constants/permission.constant.js';
import type { AuthorizationActor } from '../contracts/authorization-actor.type.js';
import type { PermissionPolicy } from '../contracts/permission-policy.type.js';
import { Permissions } from '../enums/permissions.enum.js';
import { AuthorizationService } from '../services/authorization.service.js';

describe('AuthorizationService', () => {
  const authorization = new AuthorizationService();
  const actor: AuthorizationActor = { id: 'owner', role: 'USER' };
  const own: PermissionPolicy = {
    USER: [Permission.DELETE.OWN, Permission.READ.OWN],
  };
  const any: PermissionPolicy = {
    USER: [Permission.DELETE.ANY, Permission.READ.ANY],
  };
  const request = { actor, policy: own, action: Permissions.DELETE };

  describe('assertCan', () => {
    it('accepts an authoritative matching owner', () => {
      expect(() =>
        authorization.assertCan({
          ...request,
          resource: { ownerId: actor.id },
        }),
      ).not.toThrow();
    });

    it.each([
      undefined,
      {},
      { ownerId: undefined },
      { ownerId: null },
      { ownerId: 'another' },
    ])('denies OWN without a matching owner: %o', (resource) => {
      expect(() => authorization.assertCan({ ...request, resource })).toThrow(
        ForbiddenException,
      );
    });

    it.each([undefined, { ownerId: actor.id }, { ownerId: 'another' }])(
      'allows ANY regardless of ownership: %o',
      (resource) => {
        expect(() =>
          authorization.assertCan({ ...request, policy: any, resource }),
        ).not.toThrow();
      },
    );

    it.each<PermissionPolicy>([
      { USER: [] },
      { MODERATOR: [Permission.DELETE.ANY] },
      { USER: [Permission.READ.ANY] },
      { SUPER_ADMIN: [Permission.READ.ANY] },
    ])('denies missing grants even for an owner: %o', (policy) => {
      expect(() =>
        authorization.assertCan({
          ...request,
          policy,
          resource: { ownerId: actor.id },
        }),
      ).toThrow(ForbiddenException);
    });

    it('requires explicit super-admin permission even on their own resource', () => {
      expect(() =>
        authorization.assertCan({
          ...request,
          actor: { ...actor, role: 'SUPER_ADMIN' },
          resource: { ownerId: actor.id },
        }),
      ).toThrow(ForbiddenException);
    });
  });

  describe('authorizedWhere', () => {
    const query = {
      ...request,
      match: { id: 'record' },
      ownerField: 'userId',
    } as const;

    it('adds OWN to a fresh equality filter', () => {
      expect(authorization.authorizedWhere(query)).toEqual({
        id: 'record',
        userId: actor.id,
      });
      expect(query.match).toEqual({ id: 'record' });
    });

    it('supports other ownership fields', () => {
      expect(
        authorization.authorizedWhere({ ...query, ownerField: 'authorId' }),
      ).toEqual({ id: 'record', authorId: actor.id });
    });

    it('retains the exact supplied match and ownership field types', () => {
      const filter = authorization.authorizedWhere({
        ...query,
        match: { id: 'record', tenantId: 'tenant' },
        ownerField: 'authorId',
      });
      expectTypeOf(filter.id).toEqualTypeOf<string>();
      expectTypeOf(filter.tenantId).toEqualTypeOf<string>();
      expectTypeOf(filter.authorId).toEqualTypeOf<string | undefined>();
    });

    it('cannot lose ownership through a prototype-named field', () => {
      const filter = authorization.authorizedWhere({
        ...query,
        ownerField: '__proto__',
      });
      expect(Object.hasOwn(filter, '__proto__')).toBe(true);
      expect(filter.__proto__).toBe(actor.id);
    });

    it.each([
      Object.assign(Object.create({ userId: 'another' }), { id: 'record' }),
      Object.defineProperty({ id: 'record' }, 'userId', { value: 'another' }),
      Object.defineProperty({ id: 'record' }, 'userId', {
        get: () => 'another',
        enumerable: true,
      }),
    ])(
      'rejects filters whose restrictions cannot safely be copied: %o',
      (match) => {
        expect(() =>
          authorization.authorizedWhere({ ...query, policy: any, match }),
        ).toThrow(ForbiddenException);
      },
    );

    it.each([own, any])(
      'preserves all existing equality constraints: %o',
      (policy) => {
        const match = Object.freeze({
          id: 'record',
          userId: actor.id,
          content: 'original',
          tenantId: 'tenant',
        });
        expect(
          authorization.authorizedWhere({ ...query, policy, match }),
        ).toEqual(match);
        expect(match).toEqual({
          id: 'record',
          userId: actor.id,
          content: 'original',
          tenantId: 'tenant',
        });
      },
    );

    it('keeps a narrower owner constraint even for ANY', () => {
      expect(
        authorization.authorizedWhere({
          ...query,
          policy: any,
          match: { id: 'record', userId: 'another' },
        }),
      ).toEqual({ id: 'record', userId: 'another' });
      expect(authorization.authorizedWhere({ ...query, policy: any })).toEqual({
        id: 'record',
      });
    });

    it.each([null, undefined, 'another', { equals: 'another' }])(
      'fails closed on conflicting or missing explicit ownership: %o',
      (userId) => {
        expect(() =>
          authorization.authorizedWhere({
            ...query,
            match: { id: 'record', userId },
          }),
        ).toThrow(ForbiddenException);
      },
    );

    it.each<PermissionPolicy>([
      { USER: [] },
      { MODERATOR: [Permission.DELETE.ANY] },
      { USER: [Permission.READ.ANY] },
    ])('throws instead of returning an unrestricted filter: %o', (policy) => {
      expect(() => authorization.authorizedWhere({ ...query, policy })).toThrow(
        ForbiddenException,
      );
    });

    it.each([own, any])(
      'scopes protected reads before pagination and counting: %o',
      (policy) => {
        const filter = authorization.authorizedWhere({
          ...query,
          policy,
          action: Permissions.READ,
          match: {},
        });
        const records = [
          { id: 'other', userId: 'another' },
          { id: 'mine', userId: actor.id },
        ];
        const matches = records.filter((record) =>
          Object.entries(filter).every(
            ([field, value]) => record[field as keyof typeof record] === value,
          ),
        );
        expect(matches.length).toBe(policy === own ? 1 : 2);
        expect(matches.slice(0, 1)[0].id).toBe(
          policy === own ? 'mine' : 'other',
        );
      },
    );
  });

  it.each([
    { id: actor.id, role: 'UNKNOWN' },
    { id: actor.id, role: 'constructor' },
    { id: actor.id, role: undefined },
    { id: '', role: actor.role },
    { role: actor.role },
  ])('denies malformed actors in both operations: %o', (invalid) => {
    const invalidActor = invalid as AuthorizationActor;
    expect(() =>
      authorization.assertCan({
        ...request,
        policy: any,
        actor: invalidActor,
        resource: { ownerId: actor.id },
      }),
    ).toThrow(ForbiddenException);
    expect(() =>
      authorization.authorizedWhere({
        ...request,
        policy: any,
        actor: invalidActor,
        match: { id: 'record' },
        ownerField: 'userId',
      }),
    ).toThrow(ForbiddenException);
  });
});

import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthorizationActor } from '../contracts/authorization-actor.type.js';
import type { PermissionPolicy } from '../contracts/permission-policy.type.js';
import type { Permissions } from '../enums/permissions.enum.js';
import { AccessScope } from '../enums/access-scope.enum.js';
import { evaluatePolicy } from '../utils/evaluate-policy.js';

type AuthorizationRequest = Readonly<{
  actor: AuthorizationActor;
  policy: PermissionPolicy;
  action: Permissions;
}>;

/** Equality shorthand consists of own, enumerable data fields. */
function isEqualityMatch(match: object): boolean {
  const prototype: unknown = Object.getPrototypeOf(match);
  return (
    (prototype === Object.prototype || prototype === null) &&
    Reflect.ownKeys(match).every((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(match, key);
      return (
        typeof key === 'string' &&
        !!descriptor?.enumerable &&
        'value' in descriptor
      );
    })
  );
}

@Injectable()
export class AuthorizationService {
  assertCan({
    actor,
    policy,
    action,
    resource,
  }: AuthorizationRequest & {
    resource?: Readonly<{ ownerId?: string | null }>;
  }): void {
    const scope = this.requireScope({ actor, policy, action });
    if (scope === AccessScope.OWN && resource?.ownerId !== actor.id) {
      throw new ForbiddenException('Resource ownership required');
    }
  }

  /** Adapts scope to Prisma's equality shorthand; ownerField is server configuration. */
  authorizedWhere<
    Match extends Readonly<Record<string, unknown>>,
    OwnerField extends string,
  >({
    actor,
    policy,
    action,
    match,
    ownerField,
  }: AuthorizationRequest & {
    match: Match;
    ownerField: OwnerField;
  }): Match & Partial<Record<OwnerField, string>> {
    const scope = this.requireScope({ actor, policy, action });
    if (!isEqualityMatch(match)) {
      throw new ForbiddenException('Invalid equality filter');
    }
    const ownership: Partial<Record<OwnerField, string>> = {};
    if (scope === AccessScope.OWN) {
      // An existing equality must agree; never replace a narrower restriction.
      if (Object.hasOwn(match, ownerField) && match[ownerField] !== actor.id) {
        throw new ForbiddenException('Conflicting ownership restriction');
      }
      Object.defineProperty(ownership, ownerField, {
        value: actor.id,
        enumerable: true,
      });
    }
    return { ...match, ...ownership };
  }

  private requireScope({ actor, policy, action }: AuthorizationRequest) {
    const scope = evaluatePolicy(policy, actor?.role, action);
    if (!scope || typeof actor?.id !== 'string' || !actor.id.trim()) {
      throw new ForbiddenException(`Missing permission: ${action}`);
    }
    return scope;
  }
}

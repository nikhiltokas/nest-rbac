import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../../credentials/contracts/credentials.types.js';

import {
  PERMISSIONS_KEY,
  POLICY_KEY,
} from '../../shared/constants/auth-metadata.constant.js';

import type { PermissionPolicy } from '../../shared/contracts/permission-policy.type.js';
import type { Permission } from '../../shared/enums/permission.enum.js';
import { assertPermissions } from '../../shared/utils/permissions.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<[Permission, ...Permission[]]>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );
    if (!required) return true;
    const policy = this.reflector.get<PermissionPolicy>(
      POLICY_KEY,
      context.getClass(),
    );

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) {
      throw new ForbiddenException('No authenticated user found');
    }

    assertPermissions(policy, user.role, ...required);
    return true;
  }
}

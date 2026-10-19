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
    const required = this.reflector.getAllAndMerge<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const policy = this.reflector.get<PermissionPolicy>(
      POLICY_KEY,
      context.getClass(),
    );
    if (!policy) {
      throw new ForbiddenException('No permission policy configured');
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) {
      throw new ForbiddenException('No authenticated user found');
    }

    assertPermissions(policy, user.role, ...new Set(required));
    return true;
  }
}

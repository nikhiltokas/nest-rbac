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
} from '../constants/authorization-metadata.constant.js';

import type { PermissionPolicy } from '../contracts/permission-policy.type.js';
import type { Permissions } from '../enums/permissions.enum.js';
import { assertPermissions } from '../utils/permissions.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<[Permissions, ...Permissions[]]>(
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

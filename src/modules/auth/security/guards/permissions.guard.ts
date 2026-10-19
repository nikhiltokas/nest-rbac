import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../../credentials/contracts/credentials.types.js';

import { assertPermissions } from '../../shared/utils/permissions.js';
import { resolvePermissionRequirement } from '../utils/resolve-permission-requirement.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirement = resolvePermissionRequirement(
      this.reflector,
      context.getClass(),
      context.getHandler(),
    );
    if (!requirement) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) {
      throw new ForbiddenException('No authenticated user found');
    }

    assertPermissions(requirement.policy, user.role, ...requirement.required);
    return true;
  }
}

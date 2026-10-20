import { Injectable, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import {
  PERMISSIONS_KEY,
  ROLES_KEY,
} from '../../authorization/constants/authorization-metadata.constant.js';
import { IS_PUBLIC_KEY } from '../../shared/constants/auth-metadata.constant.js';

import type { UserRole } from '../../authorization/contracts/user-role.type.js';
import type { Permissions } from '../../authorization/enums/permissions.enum.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      targets,
    );
    const roles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      targets,
    );
    const required = this.reflector.get<Permissions[]>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );
    if (isPublic && !roles && !required) return true;
    return super.canActivate(context);
  }
}

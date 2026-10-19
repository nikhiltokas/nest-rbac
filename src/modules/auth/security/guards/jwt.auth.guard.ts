import { Injectable, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import {
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
  ROLES_KEY,
} from '../../shared/constants/auth-metadata.constant.js';

import type { UserRole } from '../../shared/contracts/user-role.type.js';
import type { Permission } from '../../shared/enums/permission.enum.js';

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
    const required = this.reflector.get<Permission[]>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );
    if (isPublic && !roles && !required) return true;
    return super.canActivate(context);
  }
}

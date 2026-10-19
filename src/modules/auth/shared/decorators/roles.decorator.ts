import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ROLES_KEY } from '../constants/auth-metadata.constant.js';
import { Role } from '../constants/role.constant.js';
import type { UserRole } from '../contracts/user-role.type.js';
import { RolesGuard } from '../../security/guards/roles.guard.js';

export const Roles = Object.assign(
  (...roles: [UserRole, ...UserRole[]]) =>
    applyDecorators(SetMetadata(ROLES_KEY, roles), UseGuards(RolesGuard)),
  Role,
);

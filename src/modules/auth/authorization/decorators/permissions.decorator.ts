import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../constants/authorization-metadata.constant.js';
import type { Permissions } from '../enums/permissions.enum.js';

export const RequirePermissions = (
  ...permissions: [Permissions, ...Permissions[]]
): MethodDecorator => SetMetadata(PERMISSIONS_KEY, permissions);

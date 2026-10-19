import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../constants/auth-metadata.constant.js';
import type { Permission } from '../enums/permission.enum.js';

export const RequirePermissions = (
  ...permissions: [Permission, ...Permission[]]
) => SetMetadata(PERMISSIONS_KEY, permissions);

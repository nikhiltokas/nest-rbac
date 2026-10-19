import { SetMetadata } from '@nestjs/common';
import { PERMISSION_METHOD_EXCEPTION_KEY } from '../constants/auth-metadata.constant.js';

/** Documents a custom operation while preserving its required permissions. */
export const AllowPermissionMethodMismatch = (
  reason: string,
): MethodDecorator => SetMetadata(PERMISSION_METHOD_EXCEPTION_KEY, reason);

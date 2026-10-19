import { SetMetadata } from '@nestjs/common';
import { POLICY_KEY } from '../constants/auth-metadata.constant.js';
import type { PermissionPolicy } from '../contracts/permission-policy.type.js';

export const Policy = (policy: PermissionPolicy): ClassDecorator =>
  SetMetadata(POLICY_KEY, policy);

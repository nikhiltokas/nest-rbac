import { SetMetadata } from '@nestjs/common';
import { POLICY_KEY } from '../constants/authorization-metadata.constant.js';
import type { PermissionPolicy } from '../contracts/permission-policy.type.js';

/** References an exported policy constant on a controller. */
export const Policy = (policy: PermissionPolicy): ClassDecorator =>
  SetMetadata(POLICY_KEY, policy);

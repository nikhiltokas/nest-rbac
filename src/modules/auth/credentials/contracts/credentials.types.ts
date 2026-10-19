import type { Request } from 'express';
import type { Models } from '../../../../prisma/generated/contract.d.js';
import type { PUBLIC_USER_FIELDS } from '../constants/public-user-fields.constant.js';

export type PublicUser = Pick<
  Models.public_User,
  (typeof PUBLIC_USER_FIELDS)[number]
>;

export type AuthenticatedRequest = Request & { user: PublicUser };

import { createParamDecorator } from '@nestjs/common';
import type { PublicUser } from '../../credentials/contracts/credentials.types.js';

export const CurrentUser = createParamDecorator<keyof PublicUser | undefined>(
  (property, context) => {
    const { user } = context.switchToHttp().getRequest<{ user?: PublicUser }>();
    return property ? user?.[property] : user;
  },
);

import type { UserRole } from '../contracts/user-role.type.js';

export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  MODERATOR: 'MODERATOR',
  USER: 'USER',
} as const satisfies { [Value in UserRole]: Value };

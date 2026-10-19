import { hashPassword } from '../../modules/auth/credentials/utils/password.js';
import { db } from '../db.js';
import type { Models } from '../generated/contract.d.js';

const accounts = [
  {
    firstName: 'Super',
    lastName: 'Admin',
    username: 'superadmin',
    email: 'superadmin@example.com',
    role: 'SUPER_ADMIN',
  },
  {
    firstName: 'Mod',
    lastName: null,
    username: 'mod',
    email: 'mod@example.com',
    role: 'MODERATOR',
  },
  {
    firstName: 'User',
    lastName: null,
    username: 'user',
    email: 'user@example.com',
    role: 'USER',
  },
] as const;

export async function seedUsers(): Promise<void> {
  for (const account of accounts) {
    await db.orm.public.User.upsert({
      create: {
        ...account,
        firstName: account.firstName as Models.public_User['firstName'],
        lastName: account.lastName as Models.public_User['lastName'],
        passwordHash: await hashPassword('Password123!'),
      },
      update: {},
      conflictOn: { email: account.email },
    });
  }
}

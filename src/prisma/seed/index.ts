import { db } from '../db.js';
import { seedUsers } from './users.seed.js';

try {
  await seedUsers();
  console.log('Seeded Super Admin, Mod, and User accounts.');
} finally {
  await db.close();
}

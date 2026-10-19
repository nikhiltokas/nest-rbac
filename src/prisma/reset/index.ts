import 'dotenv/config';
import { resetDatabase } from './reset.database.js';

const connection = process.env['DATABASE_URL'];
if (!connection) {
  throw new Error('DATABASE_URL is required to reset the database.');
}

await resetDatabase(connection);
console.log('Cleared app schemas and Prisma markers. Reapplying migrations.');

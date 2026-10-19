import postgresDriver from '@prisma/orm-postgres/driver/control';
import contract from '../generated/contract.json' with { type: 'json' };

const schemas = new Set([
  ...Object.keys(contract.storage.namespaces),
  'prisma_contract',
]);

export async function resetDatabase(connection: string): Promise<void> {
  const driver = await postgresDriver.create(connection, {
    existingDatabaseOnly: true,
    connectTimeoutMs: 10_000,
  });

  try {
    await driver.query('BEGIN');
    for (const schema of schemas) {
      const identifier = `"${schema.replaceAll('"', '""')}"`;
      await driver.query(`DROP SCHEMA IF EXISTS ${identifier} CASCADE`);
    }
    await driver.query('COMMIT');
  } catch (error) {
    await driver.query('ROLLBACK');
    throw error;
  } finally {
    await driver.close();
  }
}

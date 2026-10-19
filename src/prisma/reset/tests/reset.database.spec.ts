import { resetDatabase } from '../reset.database.js';

const { create, driver } = vi.hoisted(() => ({
  create: vi.fn(),
  driver: { query: vi.fn(), close: vi.fn() },
}));

vi.mock('@prisma/orm-postgres/driver/control', () => ({
  default: { create },
}));

describe('database reset', () => {
  const connection = 'postgresql://test:test@localhost/test';

  beforeEach(() => {
    vi.resetAllMocks();
    create.mockResolvedValue(driver);
    driver.query.mockResolvedValue({ rows: [] });
    driver.close.mockResolvedValue(undefined);
  });

  it('clears the app schemas and Prisma markers in one transaction', async () => {
    await resetDatabase(connection);

    expect(create).toHaveBeenCalledWith(connection, {
      existingDatabaseOnly: true,
      connectTimeoutMs: 10_000,
    });
    expect(driver.query.mock.calls).toEqual([
      ['BEGIN'],
      ['DROP SCHEMA IF EXISTS "public" CASCADE'],
      ['DROP SCHEMA IF EXISTS "prisma_contract" CASCADE'],
      ['COMMIT'],
    ]);
    expect(driver.close).toHaveBeenCalledOnce();
  });

  it('rolls back earlier schema drops when a later drop fails', async () => {
    const error = new Error('Permission denied');
    driver.query.mockImplementation((sql: string) =>
      sql.includes('"prisma_contract"')
        ? Promise.reject(error)
        : Promise.resolve({ rows: [] }),
    );

    await expect(resetDatabase(connection)).rejects.toThrow(error);

    expect(driver.query).toHaveBeenCalledWith(
      'DROP SCHEMA IF EXISTS "public" CASCADE',
    );
    expect(driver.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(driver.query).not.toHaveBeenCalledWith('COMMIT');
    expect(driver.close).toHaveBeenCalledOnce();
  });

  it('does not issue SQL when the database connection fails', async () => {
    const error = new Error('Connection refused');
    create.mockRejectedValue(error);

    await expect(resetDatabase(connection)).rejects.toThrow(error);

    expect(driver.query).not.toHaveBeenCalled();
  });
});

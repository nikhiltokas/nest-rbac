import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import type { PrismaService } from '../../../../prisma/prisma.service.js';
import { PUBLIC_USER_FIELDS } from '../../credentials/constants/public-user-fields.constant.js';
import { JwtStrategy } from '../strategies/jwt.strategy.js';

describe('JWT identity validation', () => {
  const id = '019a0000-0000-7000-8000-000000000001';
  let strategy: JwtStrategy;
  let first: ReturnType<typeof vi.fn>;
  let select: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'test-secret-with-at-least-32-characters');
    first = vi.fn().mockResolvedValue({ id, role: 'USER' });
    select = vi.fn().mockReturnValue({ first });
    const prisma = {
      db: { orm: { public: { User: { select } } } },
    } as unknown as PrismaService;
    strategy = new JwtStrategy(prisma);
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each(
    [
      undefined,
      null,
      123,
      'token',
      [],
      {},
      { sub: null },
      { sub: 123 },
      { sub: 'invalid-id' },
    ].map((payload) => ({ payload })),
  )(
    'rejects invalid subjects before accessing storage: $payload',
    async ({ payload }) => {
      await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(select).not.toHaveBeenCalled();
    },
  );

  it('loads only public identity fields and uses the current database role', async () => {
    const user = { id, role: 'MODERATOR' };
    first.mockResolvedValue(user);
    await expect(
      strategy.validate({ sub: id, role: 'SUPER_ADMIN' }),
    ).resolves.toEqual(user);
    expect(select).toHaveBeenCalledWith(...PUBLIC_USER_FIELDS);
    expect(select.mock.calls[0]).not.toContain('passwordHash');
    expect(first).toHaveBeenCalledWith({ id });
  });

  it('rejects a user that no longer exists', async () => {
    first.mockResolvedValue(null);
    await expect(strategy.validate({ sub: id })).rejects.toThrow(
      'User no longer exists',
    );
  });

  it('does not disguise storage failures as invalid credentials', async () => {
    const failure = new Error('Storage unavailable');
    first.mockRejectedValue(failure);
    await expect(strategy.validate({ sub: id })).rejects.toBe(failure);
  });
});

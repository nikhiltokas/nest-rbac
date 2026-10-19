import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../../../../prisma/prisma.service.js';
import { CredentialsService } from '../services/credentials.service.js';
import { hashPassword } from '../utils/password.js';

describe('credential validation', () => {
  const jwt = new JwtService({
    secret: 'test-secret',
    signOptions: { expiresIn: '1h' },
  });
  const input = { email: 'alex@example.com', password: 'a-long-password' };
  const user = {
    id: '019a0000-0000-7000-8000-000000000001',
    role: 'USER',
    firstName: 'Alex',
    lastName: null,
    username: 'alex',
    email: input.email,
  };
  let service: CredentialsService;
  let first: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    first = vi.fn();
    const collection = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      first,
    };
    const prisma = {
      db: { orm: { public: { User: collection } } },
    } as unknown as PrismaService;
    service = new CredentialsService(jwt, prisma);
  });

  it('returns the matching user without their password hash', async () => {
    first.mockResolvedValue({
      ...user,
      passwordHash: await hashPassword(input.password),
    });
    const result = await service.validateUser(input);
    expect(result).toEqual(user);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rejects an incorrect password', async () => {
    first.mockResolvedValue({
      ...user,
      passwordHash: await hashPassword('another-password'),
    });
    await expect(service.validateUser(input)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it.each([null, { ...user, passwordHash: null }])(
    'rejects an unavailable credential',
    async (record) => {
      first.mockResolvedValue(record);
      await expect(service.validateUser(input)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    },
  );
});

import 'reflect-metadata';
import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import type { PrismaService } from '../../../../prisma/prisma.service.js';
import { CredentialsService } from '../../credentials/services/credentials.service.js';
import { verifyPassword } from '../../credentials/utils/password.js';
import { RegisterDto } from '../dto/register.dto.js';
import { RegisterService } from '../register.service.js';

describe('RegisterService', () => {
  const jwt = new JwtService({
    secret: 'test-secret',
    signOptions: { expiresIn: '1h' },
  });
  const input = plainToInstance(RegisterDto, {
    firstName: 'Alex',
    username: 'alex',
    email: 'alex@example.com',
    password: 'a-long-password',
  });
  const user = {
    id: '019a0000-0000-7000-8000-000000000001',
    role: 'USER',
    firstName: 'Alex',
    lastName: null,
    username: input.username,
    email: input.email,
  };
  let service: RegisterService;
  let create: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    create = vi.fn().mockResolvedValue(user);
    const prisma = {
      db: { orm: { public: { User: { select: () => ({ create }) } } } },
    } as unknown as PrismaService;
    service = new RegisterService(prisma, new CredentialsService(jwt, prisma));
  });

  it('registers with a salted hash and returns a signed identity without secrets', async () => {
    const result = await service.register(input);
    const stored = create.mock.calls[0][0];
    expect(stored).not.toHaveProperty('password');
    expect(stored.passwordHash).not.toBe(input.password);
    expect(await verifyPassword(input.password, stored.passwordHash)).toBe(
      true,
    );
    expect(jwt.verify(result.accessToken).sub).toBe(user.id);
    expect(result.user).toEqual(user);
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(stored).not.toHaveProperty('role');
  });

  it('maps a Prisma 8 unique violation to a conflict', async () => {
    create.mockRejectedValue({ kind: 'sql_query', sqlState: '23505' });
    await expect(service.register(input)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('does not hide unrelated database failures', async () => {
    const failure = new Error('Database unavailable');
    create.mockRejectedValue(failure);
    await expect(service.register(input)).rejects.toBe(failure);
  });
});

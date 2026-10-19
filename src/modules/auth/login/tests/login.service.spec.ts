import 'reflect-metadata';
import { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../../../../prisma/prisma.service.js';
import type { PublicUser } from '../../credentials/contracts/credentials.types.js';
import { CredentialsService } from '../../credentials/services/credentials.service.js';
import { LoginService } from '../login.service.js';

it('issues a token for the identity authenticated by the local guard', async () => {
  const jwt = new JwtService({
    secret: 'test-secret',
    signOptions: { expiresIn: '1h' },
  });
  const user = {
    id: '019a0000-0000-7000-8000-000000000001',
    role: 'USER',
    firstName: 'Alex',
    lastName: null,
    username: 'alex',
    email: 'alex@example.com',
  } as PublicUser;

  const service = new LoginService(
    new CredentialsService(jwt, {} as PrismaService),
  );

  const result = await service.login(user);
  const payload = jwt.verify(result.accessToken);
  expect(payload.sub).toBe(user.id);
  expect(payload.exp - payload.iat).toBe(3600);
  expect(result.user).toEqual(user);
  expect(result.user).not.toHaveProperty('passwordHash');
});

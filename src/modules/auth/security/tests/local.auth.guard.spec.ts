import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import type { CredentialsService } from '../../credentials/services/credentials.service.js';
import { LocalAuthGuard } from '../guards/local.auth.guard.js';
import { httpContext } from './helpers/http-context.js';

describe('LocalAuthGuard', () => {
  const user = { id: 'user-id', role: 'USER' };
  let validateUser: ReturnType<typeof vi.fn>;
  let guard: LocalAuthGuard;

  beforeEach(() => {
    validateUser = vi.fn().mockResolvedValue(user);
    guard = new LocalAuthGuard({
      validateUser,
    } as unknown as CredentialsService);
  });

  it('normalizes credentials and attaches the authenticated identity', async () => {
    const request = {
      body: { email: ' ALEX@example.com ', password: 'a-long-password' },
      user: undefined,
    };
    expect(await guard.canActivate(httpContext(request))).toBe(true);
    expect(validateUser).toHaveBeenCalledWith({
      email: 'alex@example.com',
      password: 'a-long-password',
    });
    expect(request.user).toEqual(user);
  });

  it.each([
    undefined,
    null,
    [],
    'credentials',
    { email: 123, password: 'a-long-password' },
    { email: 'alex@example.com', password: 12345678 },
  ])('rejects missing credential strings', async (body) => {
    await expect(
      guard.canActivate(httpContext({ body })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(validateUser).not.toHaveBeenCalled();
  });

  it('rejects invalid credentials without attaching a user', async () => {
    validateUser.mockRejectedValue(new UnauthorizedException());
    const request = {
      body: { email: 'alex@example.com', password: 'wrong-password' },
      user: undefined,
    };
    await expect(
      guard.canActivate(httpContext(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(request.user).toBeUndefined();
  });
});

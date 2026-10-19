import 'reflect-metadata';
import { SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../../../../prisma/prisma.service.js';
import { IS_PUBLIC_KEY } from '../../shared/constants/auth-metadata.constant.js';
import { Public } from '../../shared/decorators/public.decorator.js';
import { JwtAuthGuard } from '../guards/jwt.auth.guard.js';
import { JwtStrategy } from '../strategies/jwt.strategy.js';
import { httpContext } from './helpers/http-context.js';

describe('JwtAuthGuard and JwtStrategy', () => {
  const secret = 'test-secret-with-at-least-32-characters';
  const jwt = new JwtService({ secret });
  const id = '019a0000-0000-7000-8000-000000000001';
  const user = { id, role: 'USER' };
  let first: ReturnType<typeof vi.fn>;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', secret);
    first = vi.fn().mockResolvedValue(user);
    const prisma = {
      db: { orm: { public: { User: { select: () => ({ first }) } } } },
    } as unknown as PrismaService;
    new JwtStrategy(prisma);
    guard = new JwtAuthGuard(new Reflector());
  });

  afterEach(() => vi.unstubAllEnvs());

  it('loads the current identity for a valid bearer token', async () => {
    const request = {
      headers: { authorization: `Bearer ${jwt.sign({ sub: id })}` },
      user: undefined,
    };
    expect(await guard.canActivate(httpContext(request))).toBe(true);
    expect(request.user).toEqual(user);
  });

  it.each([undefined, 'Basic credentials', 'Bearer', 'Bearer token extra'])(
    'rejects a malformed authorization header',
    async (authorization) => {
      await expect(
        guard.canActivate(httpContext({ headers: { authorization } })),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(first).not.toHaveBeenCalled();
    },
  );

  it.each([
    jwt.sign({ sub: id }, { expiresIn: -1 }),
    jwt.sign({ sub: id }, { secret: 'incorrect-secret' }),
    jwt.sign({ sub: 'invalid-id' }),
    jwt.sign({}),
    jwt.sign({ sub: id }, { algorithm: 'HS384' }),
  ])('rejects an invalid token before querying the database', async (token) => {
    await expect(
      guard.canActivate(
        httpContext({ headers: { authorization: `Bearer ${token}` } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(first).not.toHaveBeenCalled();
  });

  it('rejects tokens belonging to a deleted user', async () => {
    first.mockResolvedValue(null);
    await expect(
      guard.canActivate(
        httpContext({
          headers: { authorization: `Bearer ${jwt.sign({ sub: id })}` },
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('uses the database role instead of a role supplied in the token', async () => {
    const request = {
      headers: {
        authorization: `Bearer ${jwt.sign({ sub: id, role: 'SUPER_ADMIN' })}`,
      },
      user: undefined,
    };
    await guard.canActivate(httpContext(request));
    expect(request.user).toEqual(user);
  });

  it('allows public methods without a token', () => {
    class Controller {
      @Public()
      route(this: void) {}
    }
    expect(
      guard.canActivate(
        httpContext({}, Controller.prototype.route, Controller),
      ),
    ).toBe(true);
    expect(first).not.toHaveBeenCalled();
  });

  it('allows a public controller without a token', () => {
    @Public()
    class Controller {
      route(this: void) {}
    }
    expect(
      guard.canActivate(
        httpContext({}, Controller.prototype.route, Controller),
      ),
    ).toBe(true);
  });

  it('lets a method require authentication inside a public controller', async () => {
    @Public()
    class Controller {
      @SetMetadata(IS_PUBLIC_KEY, false)
      route(this: void) {}
    }
    await expect(
      guard.canActivate(
        httpContext({ headers: {} }, Controller.prototype.route, Controller),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

import 'reflect-metadata';
import { SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../../../../prisma/prisma.service.js';
import { IS_PUBLIC_KEY } from '../../shared/constants/auth-metadata.constant.js';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Public } from '../../shared/decorators/public.decorator.js';
import { Roles } from '../../shared/decorators/roles.decorator.js';
import { Permission } from '../../shared/enums/permission.enum.js';
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
    expect(first).toHaveBeenCalledWith({ id });
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

  it('ignores an invalid token on an unrestricted public route', () => {
    class Controller {
      @Public()
      route(this: void) {}
    }
    expect(
      guard.canActivate(
        httpContext(
          { headers: { authorization: 'Bearer invalid' } },
          Controller.prototype.route,
          Controller,
        ),
      ),
    ).toBe(true);
    expect(first).not.toHaveBeenCalled();
  });

  it.each(['roleRestricted', 'permissionRestricted'] as const)(
    'requires authentication when a public method is %s',
    async (method) => {
      class Controller {
        @Public()
        @Roles(Roles.USER)
        roleRestricted(this: void) {}

        @Public()
        @RequirePermissions(Permission.UPDATE)
        permissionRestricted(this: void) {}
      }
      await expect(
        guard.canActivate(
          httpContext(
            { headers: {} },
            Controller.prototype[method],
            Controller,
          ),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );

  it('requires authentication for a public controller with inherited roles', async () => {
    @Public()
    @Roles(Roles.USER)
    class Controller {
      route(this: void) {}
    }
    await expect(
      guard.canActivate(
        httpContext({ headers: {} }, Controller.prototype.route, Controller),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('authenticates a public route when explicit permissions are present', async () => {
    @Public()
    class Controller {
      @RequirePermissions(Permission.UPDATE)
      route(this: void) {}
    }
    const request = {
      headers: { authorization: `Bearer ${jwt.sign({ sub: id })}` },
      user: undefined,
    };
    await expect(
      guard.canActivate(
        httpContext(request, Controller.prototype.route, Controller),
      ),
    ).resolves.toBe(true);
    expect(request.user).toEqual(user);
  });
});

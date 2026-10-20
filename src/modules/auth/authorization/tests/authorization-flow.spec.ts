import { Permission } from '../constants/permission.constant.js';
import 'reflect-metadata';
import {
  Controller,
  Get,
  Post,
  SetMetadata,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { NoteModule } from '../../../note/note.module.js';
import { NoteService } from '../../../note/note.service.js';
import { CommentModule } from '../../../comment/comment.module.js';
import { CommentService } from '../../../comment/comment.service.js';
import { AuthModule } from '../../auth.module.js';
import type { PublicUser } from '../../credentials/contracts/credentials.types.js';
import { CredentialsService } from '../../credentials/services/credentials.service.js';
import { IS_PUBLIC_KEY } from '../../shared/constants/auth-metadata.constant.js';
import type { AuthorizationActor } from '../contracts/authorization-actor.type.js';
import type { PermissionPolicy } from '../contracts/permission-policy.type.js';
import type { UserRole } from '../contracts/user-role.type.js';
import { CurrentUser } from '../../shared/decorators/current.user.decorator.js';
import { RequirePermissions } from '../decorators/permissions.decorator.js';
import { AllowPermissionMethodMismatch } from '../decorators/permission-method-exception.decorator.js';
import { Policy } from '../decorators/policy.decorator.js';
import { Public } from '../../shared/decorators/public.decorator.js';
import { Roles } from '../decorators/roles.decorator.js';
import { Permissions } from '../enums/permissions.enum.js';
import * as permissionMethodValidation from '../utils/validate-permission-method.js';

const policy: PermissionPolicy = {
  SUPER_ADMIN: Object.values(Permission).map((grant) => grant.ANY),
  MODERATOR: [
    Permission.CREATE.ANY,
    Permission.READ.ANY,
    Permission.UPDATE.ANY,
  ],
  USER: [Permission.READ.ANY],
};

@Controller('notes')
@Policy(policy)
class CustomOperationsController {
  @Post(':id/publish')
  @RequirePermissions(Permissions.UPDATE)
  @AllowPermissionMethodMismatch('Publishing updates an existing note.')
  publish(@CurrentUser() actor: AuthorizationActor) {
    return actor;
  }

  @Post('search')
  @RequirePermissions(Permissions.READ)
  @AllowPermissionMethodMismatch('Search accepts filters in the request body.')
  search(@CurrentUser('id') id: string) {
    return { id };
  }

  @Post('bulk-delete')
  @RequirePermissions(Permissions.READ, Permissions.DELETE)
  @AllowPermissionMethodMismatch('Bulk deletion removes the selected notes.')
  bulkDelete(@CurrentUser() actor: AuthorizationActor) {
    return actor;
  }

  @Post('restricted-public')
  @Public()
  @RequirePermissions(Permissions.UPDATE)
  @AllowPermissionMethodMismatch('This operation updates an existing note.')
  restrictedPublic(@CurrentUser() actor: AuthorizationActor) {
    return actor;
  }

  @Get('both')
  @Roles(Roles.USER, Roles.SUPER_ADMIN)
  @RequirePermissions(Permissions.UPDATE)
  @AllowPermissionMethodMismatch(
    'This fixture exercises UPDATE alongside role restrictions.',
  )
  both(@CurrentUser() actor: AuthorizationActor) {
    return actor;
  }
}

@Controller('role-only')
@Public()
@Roles(Roles.USER)
class RoleOnlyController {
  @Get()
  profile(@CurrentUser() actor: AuthorizationActor) {
    return actor;
  }
}

@Controller('public')
@Public()
class PublicController {
  @Get()
  index(this: void) {
    return 'public';
  }

  @Get('private')
  @SetMetadata(IS_PUBLIC_KEY, false)
  profile(@CurrentUser() actor: AuthorizationActor) {
    return actor;
  }
}

describe('HTTP authentication and authorization', () => {
  const secret = 'integration-secret-with-at-least-32-characters';
  const jwt = new JwtService({ secret });
  const users: AuthorizationActor[] = [
    { id: '019a0000-0000-7000-8000-000000000001', role: 'USER' },
    { id: '019a0000-0000-7000-8000-000000000002', role: 'MODERATOR' },
    { id: '019a0000-0000-7000-8000-000000000003', role: 'SUPER_ADMIN' },
  ];
  let app: INestApplication;
  const resourceId = '019a0000-0000-7000-8000-000000000004';
  function resourceService() {
    return {
      create: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
  }
  const notes = resourceService();
  const comments = resourceService();
  const create = vi.fn();
  const first = vi.fn(({ id }: { id: string }) =>
    Promise.resolve(users.find((user) => user.id === id) ?? null),
  );

  function token(role: UserRole): string {
    return jwt.sign({ sub: users.find((user) => user.role === role)!.id });
  }

  beforeAll(async () => {
    vi.stubEnv('JWT_SECRET', secret);
    const prisma = {
      db: { orm: { public: { User: { select: () => ({ first, create }) } } } },
    } as unknown as PrismaService;
    const module = await Test.createTestingModule({
      imports: [AuthModule, NoteModule, CommentModule],
      controllers: [
        CustomOperationsController,
        RoleOnlyController,
        PublicController,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(NoteService)
      .useValue(notes)
      .overrideProvider(CommentService)
      .useValue(comments)
      .compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    first.mockClear();
    create.mockReset().mockResolvedValue(users[0]);
    for (const service of [notes, comments]) {
      for (const method of Object.values(service)) method.mockReset();
      service.findAll.mockResolvedValue([]);
      service.findOne.mockResolvedValue({ id: resourceId });
      service.create.mockResolvedValue({ id: resourceId });
      service.update.mockResolvedValue({ id: resourceId });
      service.remove.mockResolvedValue(undefined);
    }
  });

  afterAll(async () => {
    await app?.close();
    vi.unstubAllEnvs();
  });

  afterEach(() => vi.restoreAllMocks());

  it('does not repeat HTTP method validation while serving requests', async () => {
    const validate = vi.spyOn(
      permissionMethodValidation,
      'validatePermissionMethod',
    );
    await request(app.getHttpServer()).get('/notes').expect(200);
    await request(app.getHttpServer())
      .post('/notes/1/publish')
      .auth(token('MODERATOR'), { type: 'bearer' })
      .expect(201);
    expect(validate).not.toHaveBeenCalled();
  });

  it.each(['/notes', '/public'])(
    'serves public GET %s without an identity lookup',
    async (path) => {
      await request(app.getHttpServer()).get(path).expect(200);
      expect(first).not.toHaveBeenCalled();
    },
  );

  it.each([
    '/notes/1/publish',
    '/notes/restricted-public',
    '/notes/bulk-delete',
  ])('rejects an anonymous POST %s', async (path) => {
    await request(app.getHttpServer()).post(path).expect(401);
    expect(first).not.toHaveBeenCalled();
  });

  it.each([
    { path: '/notes/1/publish', role: 'USER', status: 403 },
    { path: '/notes/1/publish', role: 'MODERATOR', status: 201 },
    { path: '/notes/1/publish', role: 'SUPER_ADMIN', status: 201 },
    { path: '/notes/search', role: 'USER', status: 201 },
    { path: '/notes/bulk-delete', role: 'MODERATOR', status: 403 },
    { path: '/notes/bulk-delete', role: 'SUPER_ADMIN', status: 201 },
    { path: '/notes/restricted-public', role: 'USER', status: 403 },
    { path: '/notes/restricted-public', role: 'MODERATOR', status: 201 },
  ] as const)(
    'enforces business permissions for $role on POST $path',
    async ({ path, role, status }) => {
      await request(app.getHttpServer())
        .post(path)
        .auth(token(role), { type: 'bearer' })
        .expect(status);
    },
  );

  it('exposes the authenticated identity through CurrentUser', async () => {
    const response = await request(app.getHttpServer())
      .post('/notes/search')
      .auth(token('USER'), { type: 'bearer' })
      .expect(201);
    expect(response.body).toEqual({ id: users[0].id });
  });

  it.each([
    { role: 'USER', status: 403 },
    { role: 'MODERATOR', status: 403 },
    { role: 'SUPER_ADMIN', status: 200 },
  ] as const)(
    'requires both role and permission grants for $role',
    async ({ role, status }) => {
      await request(app.getHttpServer())
        .get('/notes/both')
        .auth(token(role), { type: 'bearer' })
        .expect(status);
    },
  );

  it('requires authentication for controller-level roles despite Public', async () => {
    await request(app.getHttpServer()).get('/role-only').expect(401);
  });

  it.each([
    { role: 'USER', status: 200 },
    { role: 'MODERATOR', status: 403 },
  ] as const)(
    'enforces controller-level roles for $role',
    async ({ role, status }) => {
      await request(app.getHttpServer())
        .get('/role-only')
        .auth(token(role), { type: 'bearer' })
        .expect(status);
    },
  );

  it('enforces a private method inside a public controller', async () => {
    await request(app.getHttpServer()).get('/public/private').expect(401);
    const response = await request(app.getHttpServer())
      .get('/public/private')
      .auth(token('USER'), { type: 'bearer' })
      .expect(200);
    expect(response.body).toEqual(users[0]);
  });

  it('authenticates login with the local guard and issues a session without a bearer token', async () => {
    const validateUser = vi
      .spyOn(app.get(CredentialsService), 'validateUser')
      .mockResolvedValue(users[0] as PublicUser);
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ' ALEX@example.com ', password: 'a-long-password' })
      .expect(200);
    expect(validateUser).toHaveBeenCalledWith({
      email: 'alex@example.com',
      password: 'a-long-password',
    });
    expect(response.body.user).toEqual(users[0]);
    expect(jwt.verify(response.body.accessToken).sub).toBe(users[0].id);
    expect(first).not.toHaveBeenCalled();
  });

  it('rejects login without credentials', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({}).expect(401);
    expect(first).not.toHaveBeenCalled();
  });

  it('registers a public identity and issues a session without a bearer token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'alex@example.com',
        password: 'a-long-password',
        firstName: 'Alex',
        username: 'alex',
      })
      .expect(201);
    expect(response.body.user).toEqual(users[0]);
    expect(jwt.verify(response.body.accessToken).sub).toBe(users[0].id);
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(first).not.toHaveBeenCalled();
  });

  it('rejects registration privilege fields before accessing storage', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'alex@example.com',
        password: 'a-long-password',
        firstName: 'Alex',
        username: 'alex',
        role: 'SUPER_ADMIN',
      })
      .expect(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('denies note deletion to moderators before calling the service', async () => {
    await request(app.getHttpServer())
      .delete(`/notes/${resourceId}`)
      .auth(token('MODERATOR'), { type: 'bearer' })
      .expect(403);
    expect(notes.remove).not.toHaveBeenCalled();
  });

  describe.each([
    {
      path: 'notes',
      service: notes,
      payload: { title: 'A note', content: 'Content' },
      writers: ['MODERATOR', 'SUPER_ADMIN'] as UserRole[],
      deleters: ['SUPER_ADMIN'] as UserRole[],
    },
    {
      path: 'comments',
      service: comments,
      payload: { content: 'A comment' },
      writers: ['USER', 'SUPER_ADMIN'] as UserRole[],
      deleters: ['USER', 'MODERATOR', 'SUPER_ADMIN'] as UserRole[],
    },
  ] as const)(
    '$path resource routes',
    ({ path, service, payload, writers, deleters }) => {
      it('serves public lists with validated pagination', async () => {
        await request(app.getHttpServer())
          .get(`/${path}?limit=5&offset=10`)
          .expect(200, []);
        expect(service.findAll).toHaveBeenCalledWith(5, 10);
        expect(first).not.toHaveBeenCalled();
      });

      it('uses default pagination when no query is provided', async () => {
        await request(app.getHttpServer()).get(`/${path}`).expect(200);
        expect(service.findAll).toHaveBeenCalledWith(20, 0);
      });

      it('rejects invalid pagination before calling the service', async () => {
        await request(app.getHttpServer())
          .get(`/${path}?limit=101&offset=-1`)
          .expect(400);
        expect(service.findAll).not.toHaveBeenCalled();
      });

      it('serves a public resource by UUID', async () => {
        await request(app.getHttpServer())
          .get(`/${path}/${resourceId}`)
          .expect(200, { id: resourceId });
        expect(service.findOne).toHaveBeenCalledWith(resourceId);
        expect(first).not.toHaveBeenCalled();
      });

      it('rejects malformed resource IDs before calling the service', async () => {
        await request(app.getHttpServer())
          .get(`/${path}/invalid-id`)
          .expect(400);
        expect(service.findOne).not.toHaveBeenCalled();
      });

      it.each<UserRole>(['USER', 'MODERATOR', 'SUPER_ADMIN'])(
        'enforces creation and update permissions for %s',
        async (role) => {
          const allowed = writers.includes(role);
          await request(app.getHttpServer())
            .post(`/${path}`)
            .auth(token(role), { type: 'bearer' })
            .send(payload)
            .expect(allowed ? 201 : 403);
          await request(app.getHttpServer())
            .patch(`/${path}/${resourceId}`)
            .auth(token(role), { type: 'bearer' })
            .send(payload)
            .expect(allowed ? 200 : 403);
          if (allowed) {
            const actor = users.find((user) => user.role === role);
            expect(service.create).toHaveBeenCalledWith(payload, actor);
            expect(service.update).toHaveBeenCalledWith(
              resourceId,
              payload,
              actor,
            );
          } else {
            expect(service.create).not.toHaveBeenCalled();
            expect(service.update).not.toHaveBeenCalled();
          }
        },
      );

      for (const writer of writers) {
        it(`rejects invalid content and ownership fields from ${writer}`, async () => {
          for (const body of [
            { ...payload, content: '' },
            { ...payload, userId: users[0].id },
          ]) {
            await request(app.getHttpServer())
              .post(`/${path}`)
              .auth(token(writer), { type: 'bearer' })
              .send(body)
              .expect(400);
          }
          expect(service.create).not.toHaveBeenCalled();
        });
      }

      it.each<UserRole>(['USER', 'MODERATOR', 'SUPER_ADMIN'])(
        'enforces deletion permissions for %s',
        async (role) => {
          const allowed = deleters.includes(role);
          const response = await request(app.getHttpServer())
            .delete(`/${path}/${resourceId}`)
            .auth(token(role), { type: 'bearer' })
            .expect(allowed ? 204 : 403);
          if (allowed) {
            expect(response.text).toBe('');
            expect(service.remove).toHaveBeenCalledWith(
              resourceId,
              users.find((user) => user.role === role),
            );
          } else {
            expect(service.remove).not.toHaveBeenCalled();
          }
        },
      );

      it('blocks anonymous writes before calling the service', async () => {
        await request(app.getHttpServer())
          .post(`/${path}`)
          .send(payload)
          .expect(401);
        expect(service.create).not.toHaveBeenCalled();
      });
    },
  );
});

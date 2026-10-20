import 'reflect-metadata';
import {
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Scope,
  SetMetadata,
  type Type,
} from '@nestjs/common';

import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';

import { Test, type TestingModule } from '@nestjs/testing';
import { AuthorizationModule } from '../authorization.module.js';
import { COMMENT_POLICY } from '../../../comment/policy/comment.policy.js';
import { Permission } from '../constants/permission.constant.js';
import type { PermissionPolicy } from '../contracts/permission-policy.type.js';
import { NOTE_POLICY } from '../../../note/policy/note.policy.js';
import { POLICY_KEY } from '../constants/authorization-metadata.constant.js';
import { RequirePermissions } from '../decorators/permissions.decorator.js';
import { Policy } from '../decorators/policy.decorator.js';
import { Public } from '../../shared/decorators/public.decorator.js';
import { Permissions } from '../enums/permissions.enum.js';
import { PermissionConfigurationError } from '../errors/permission-configuration.error.js';
import { PermissionRoutesValidator } from '../validators/permission-routes.validator.js';

describe('permission route validation during application bootstrap', () => {
  let module: TestingModule | undefined;

  async function bootstrap(...controllers: Type[]) {
    module = await Test.createTestingModule({
      imports: [AuthorizationModule],
      controllers,
    }).compile();
    return module.init();
  }

  beforeEach(() => {
    module = undefined;
  });

  afterEach(async () => {
    await module?.close();
  });

  const MODERATOR_POLICY: PermissionPolicy = {
    MODERATOR: [Permission.DELETE.ANY],
  };
  const ADMIN_POLICY: PermissionPolicy = {
    SUPER_ADMIN: [Permission.DELETE.OWN],
  };

  it.each([MODERATOR_POLICY, ADMIN_POLICY, COMMENT_POLICY])(
    'accepts named partial and multi-role policies during bootstrap: %o',
    async (policy) => {
      @Controller('comments')
      @Policy(policy)
      class CommentsController {
        @Delete(':id')
        @RequirePermissions(Permissions.DELETE)
        remove(this: void) {}
      }
      await expect(bootstrap(CommentsController)).resolves.toBeDefined();
    },
  );

  it.each([
    { name: 'empty', policy: {} },
    { name: 'unknown role', policy: { UNKNOWN: [Permissions.READ] } },
    { name: 'invalid permission', policy: { MODERATOR: ['UNKNOWN'] } },
    { name: 'undefined grant', policy: { MODERATOR: undefined } },
    { name: 'null grants', policy: { USER: null } },
    { name: 'non-array grants', policy: { USER: Permission.READ.OWN } },
    { name: 'unscoped action', policy: { USER: [Permissions.READ] } },
    { name: 'sparse grants', policy: { USER: Array(1) } },
    { name: 'missing scope', policy: { USER: [{ action: Permissions.READ }] } },
    {
      name: 'unknown scope',
      policy: { USER: [{ action: Permissions.READ, scope: 'unknown' }] },
    },
    {
      name: 'extra grant field',
      policy: { USER: [{ ...Permission.READ.OWN, extra: true }] },
    },
    { name: 'symbol key', policy: { USER: [], [Symbol('role')]: [] } },
    {
      name: 'inherited role',
      policy: Object.create({ USER: [Permission.READ.ANY] }),
    },
    {
      name: 'inherited grant',
      policy: { USER: [Object.create(Permission.READ.ANY)] },
    },
  ])('rejects $name policies during bootstrap', async ({ policy }) => {
    @Controller('comments')
    @SetMetadata(POLICY_KEY, policy)
    class CommentsController {
      @Get()
      @RequirePermissions(Permissions.READ)
      list(this: void) {}
    }
    await expect(bootstrap(CommentsController)).rejects.toThrow(
      'CommentsController has invalid permissionPolicy metadata.',
    );
  });

  it('rejects invalid route declarations during application bootstrap', async () => {
    @Controller('comments')
    @Policy(NOTE_POLICY)
    class CommentsController {
      @Get()
      list(this: void) {}
    }
    const startup = bootstrap(CommentsController);
    await expect(startup).rejects.toBeInstanceOf(PermissionConfigurationError);
    await expect(startup).rejects.toThrow(
      'CommentsController.list is missing required permissions.',
    );
  });

  it('collects missing declarations and method mismatches across controllers', async () => {
    @Controller('comments')
    @Policy(NOTE_POLICY)
    class CommentsController {
      @Post()
      create(this: void) {}

      @Delete(':id')
      @RequirePermissions(Permissions.READ)
      remove(this: void) {}
    }

    @Controller('notes')
    @Policy(NOTE_POLICY)
    class NotesController {
      @Patch(':id')
      update(this: void) {}
    }

    const startup = bootstrap(CommentsController, NotesController);
    await expect(startup).rejects.toThrow(
      'CommentsController.create is missing required permissions.',
    );
    await expect(startup).rejects.toThrow(
      'CommentsController.remove uses DELETE but does not declare Permissions.DELETE.',
    );
    await expect(startup).rejects.toThrow(
      'NotesController.update is missing required permissions.',
    );
  });

  it('accepts valid routes and public routes and ignores helper methods', async () => {
    @Controller('comments')
    @Policy(NOTE_POLICY)
    class CommentsController {
      @Get()
      @Public()
      list(this: void) {}

      @Post()
      @RequirePermissions(Permissions.CREATE)
      create(this: void) {}

      helper(this: void) {}
    }

    @Controller('public')
    @Policy(NOTE_POLICY)
    @Public()
    class PublicController {
      @Get()
      list(this: void) {}
    }

    @Controller('authenticated')
    class AuthenticatedController {
      @Get()
      profile(this: void) {}
    }

    await expect(
      bootstrap(CommentsController, PublicController, AuthenticatedController),
    ).resolves.toBeDefined();
  });

  it('discovers inherited routes on request-scoped controllers', async () => {
    class BaseController {
      @Get()
      list(this: void) {}
    }

    @Controller({ path: 'comments', scope: Scope.REQUEST })
    @Policy(NOTE_POLICY)
    class CommentsController extends BaseController {}

    await expect(bootstrap(CommentsController)).rejects.toThrow(
      'CommentsController.list is missing required permissions.',
    );
  });

  it('does not hide unexpected failures as configuration diagnostics', () => {
    @Policy(NOTE_POLICY)
    class CommentsController {
      @Get()
      list(this: void) {}
    }
    const discovery = {
      getControllers: () => [{ metatype: CommentsController }],
    } as unknown as DiscoveryService;
    const reflector = new Reflector();
    const failure = new Error('Unexpected metadata failure');
    vi.spyOn(reflector, 'get').mockImplementation(() => {
      throw failure;
    });
    const validator = new PermissionRoutesValidator(
      discovery,
      new MetadataScanner(),
      reflector,
    );
    expect(() => validator.onApplicationBootstrap()).toThrow(failure);
  });

  it('ignores discovery entries without a controller class', () => {
    const discovery = {
      getControllers: () => [{ metatype: null }],
    } as unknown as DiscoveryService;
    const validator = new PermissionRoutesValidator(
      discovery,
      new MetadataScanner(),
      new Reflector(),
    );
    expect(() => validator.onApplicationBootstrap()).not.toThrow();
  });
});

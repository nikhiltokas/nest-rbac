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

import {
  DiscoveryModule,
  DiscoveryService,
  MetadataScanner,
  Reflector,
} from '@nestjs/core';

import { Test, type TestingModule } from '@nestjs/testing';
import { COMMENT_POLICY } from '../../../comment/policy/comment.policy.js';
import { NOTE_POLICY } from '../../../note/policy/note.policy.js';
import { POLICY_KEY } from '../../shared/constants/auth-metadata.constant.js';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Policy } from '../../shared/decorators/policy.decorator.js';
import { Public } from '../../shared/decorators/public.decorator.js';
import { Permission } from '../../shared/enums/permission.enum.js';
import { PermissionConfigurationError } from '../errors/permission-configuration.error.js';
import { PermissionRoutesValidator } from '../validators/permission-routes.validator.js';

describe('permission route validation during application bootstrap', () => {
  let module: TestingModule | undefined;

  async function bootstrap(...controllers: Type[]) {
    module = await Test.createTestingModule({
      imports: [DiscoveryModule],
      controllers,
      providers: [PermissionRoutesValidator],
    }).compile();
    return module.init();
  }

  beforeEach(() => {
    module = undefined;
  });

  afterEach(async () => {
    await module?.close();
  });

  it('accepts a named moderator-only policy during bootstrap', async () => {
    @Controller('comments')
    @Policy(COMMENT_POLICY)
    class CommentsController {
      @Delete(':id')
      @RequirePermissions(Permission.DELETE)
      remove(this: void) {}
    }
    await expect(bootstrap(CommentsController)).resolves.toBeDefined();
  });

  it.each([
    { name: 'empty', policy: {} },
    { name: 'unknown role', policy: { UNKNOWN: [Permission.READ] } },
    { name: 'invalid permission', policy: { MODERATOR: ['UNKNOWN'] } },
    { name: 'undefined grant', policy: { MODERATOR: undefined } },
  ])('rejects $name policies during bootstrap', async ({ policy }) => {
    @Controller('comments')
    @SetMetadata(POLICY_KEY, policy)
    class CommentsController {
      @Get()
      @RequirePermissions(Permission.READ)
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
      @RequirePermissions(Permission.READ)
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
      'CommentsController.remove uses DELETE but does not declare Permission.DELETE.',
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
      @RequirePermissions(Permission.CREATE)
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

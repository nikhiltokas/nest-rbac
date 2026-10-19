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
import { NOTE_POLICY } from '../../../note/policy/note.policy.js';

import {
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
} from '../../shared/constants/auth-metadata.constant.js';

import { Policy } from '../../shared/decorators/policy.decorator.js';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
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
      providers: [
        {
          provide: PermissionRoutesValidator,
          inject: [DiscoveryService, MetadataScanner, Reflector],
          useFactory: (
            discovery: DiscoveryService,
            scanner: MetadataScanner,
            reflector: Reflector,
          ) => new PermissionRoutesValidator(discovery, scanner, reflector),
        },
      ],
    }).compile();
    return module.init();
  }

  beforeEach(() => {
    module = undefined;
  });

  afterEach(async () => {
    await module?.close();
  });

  it('rejects a protected GET route without required permissions', async () => {
    @Controller('comments')
    @Policy(NOTE_POLICY)
    class CommentsController {
      @Get()
      list(this: void) {}
    }
    const startup = bootstrap(CommentsController);
    await expect(startup).rejects.toBeInstanceOf(PermissionConfigurationError);
    await expect(startup).rejects.toThrow(
      'CommentsController.list has a policy but is missing required permissions',
    );
  });

  it('reports every invalid route across controllers together', async () => {
    @Controller('comments')
    @Policy(NOTE_POLICY)
    class CommentsController {
      @Post()
      create(this: void) {}

      @Delete(':id')
      remove(this: void) {}
    }

    @Controller('notes')
    @Policy(NOTE_POLICY)
    class NotesController {
      @Patch(':id')
      update(this: void) {}
    }

    await expect(
      bootstrap(CommentsController, NotesController),
    ).rejects.toThrow(
      /CommentsController\.create[\s\S]*CommentsController\.remove[\s\S]*NotesController\.update/,
    );
  });

  it('accepts valid declarations and public routes and ignores helper methods', async () => {
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

  it('requires permissions when a method overrides controller-level public access', async () => {
    @Controller('comments')
    @Policy(NOTE_POLICY)
    @Public()
    class CommentsController {
      @Get('private')
      @SetMetadata(IS_PUBLIC_KEY, false)
      privateRoute(this: void) {}
    }
    await expect(bootstrap(CommentsController)).rejects.toThrow(
      'CommentsController.privateRoute has a policy but is missing required permissions',
    );
  });

  it('rejects an empty permission declaration', async () => {
    @Controller('comments')
    @Policy(NOTE_POLICY)
    class CommentsController {
      @Get()
      @SetMetadata(PERMISSIONS_KEY, [])
      list(this: void) {}
    }
    await expect(bootstrap(CommentsController)).rejects.toThrow(
      'CommentsController.list has a policy but is missing required permissions',
    );
  });

  it('accepts permissions declared at controller level', async () => {
    @Controller('comments')
    @Policy(NOTE_POLICY)
    @RequirePermissions(Permission.READ)
    class CommentsController {
      @Get()
      list(this: void) {}
    }
    await expect(bootstrap(CommentsController)).resolves.toBeDefined();
  });

  it('validates inherited routes on request-scoped controllers', async () => {
    class BaseController {
      @Get()
      list(this: void) {}
    }

    @Controller({ path: 'comments', scope: Scope.REQUEST })
    @Policy(NOTE_POLICY)
    class CommentsController extends BaseController {}

    await expect(bootstrap(CommentsController)).rejects.toThrow(
      'CommentsController.list has a policy but is missing required permissions',
    );
  });

  it('rejects required permissions without a controller policy', async () => {
    @Controller('comments')
    class CommentsController {
      @Get()
      @RequirePermissions(Permission.READ)
      list(this: void) {}
    }
    await expect(bootstrap(CommentsController)).rejects.toThrow(
      'No permission policy configured for CommentsController.list',
    );
  });
});

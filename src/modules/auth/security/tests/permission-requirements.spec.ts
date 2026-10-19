import 'reflect-metadata';
import { InternalServerErrorException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
} from '../../shared/constants/auth-metadata.constant.js';

import type { PermissionPolicy } from '../../shared/contracts/permission-policy.type.js';
import { Policy } from '../../shared/decorators/policy.decorator.js';
import { RequirePermissions } from '../../shared/decorators/permissions.decorator.js';
import { Public } from '../../shared/decorators/public.decorator.js';
import { Permission } from '../../shared/enums/permission.enum.js';
import { PermissionsGuard } from '../guards/permissions.guard.js';
import { httpContext } from './helpers/http-context.js';

const TEST_POLICY: PermissionPolicy = {
  SUPER_ADMIN: Object.values(Permission),
  MODERATOR: [Permission.READ, Permission.UPDATE],
  USER: [Permission.READ],
};

describe('missing permission declarations at runtime', () => {
  const guard = new PermissionsGuard(new Reflector());

  @Policy(TEST_POLICY)
  class CommentsController {
    remove(this: void) {}

    @Public()
    list(this: void) {}

    @SetMetadata(PERMISSIONS_KEY, [])
    empty(this: void) {}

    @RequirePermissions(Permission.READ)
    read(this: void) {}
  }

  it('names the controller and method instead of allowing an undecorated route', () => {
    expect(() =>
      guard.canActivate(
        httpContext(
          { user: { role: 'SUPER_ADMIN' } },
          CommentsController.prototype.remove,
          CommentsController,
        ),
      ),
    ).toThrow(
      'CommentsController.remove has a policy but is missing required permissions',
    );
  });

  it('reports missing declarations as server configuration errors', () => {
    expect(() =>
      guard.canActivate(
        httpContext(
          {},
          CommentsController.prototype.remove,
          CommentsController,
        ),
      ),
    ).toThrow(InternalServerErrorException);
  });

  it('treats an empty permission array as a missing declaration', () => {
    expect(() =>
      guard.canActivate(
        httpContext({}, CommentsController.prototype.empty, CommentsController),
      ),
    ).toThrow(
      'CommentsController.empty has a policy but is missing required permissions',
    );
  });

  it('allows a public method without permissions or a user', () => {
    expect(
      guard.canActivate(
        httpContext({}, CommentsController.prototype.list, CommentsController),
      ),
    ).toBe(true);
  });

  it('allows a public controller without permissions', () => {
    @Policy(TEST_POLICY)
    @Public()
    class PublicController {
      list(this: void) {}
    }
    expect(
      guard.canActivate(
        httpContext({}, PublicController.prototype.list, PublicController),
      ),
    ).toBe(true);
  });

  it('requires a declaration when a method overrides a public controller', () => {
    @Policy(TEST_POLICY)
    @Public()
    class PublicController {
      @SetMetadata(IS_PUBLIC_KEY, false)
      privateRoute(this: void) {}
    }
    expect(() =>
      guard.canActivate(
        httpContext(
          {},
          PublicController.prototype.privateRoute,
          PublicController,
        ),
      ),
    ).toThrow(
      'PublicController.privateRoute has a policy but is missing required permissions',
    );
  });

  it('accepts a permission requirement inherited from the controller', () => {
    @Policy(TEST_POLICY)
    @RequirePermissions(Permission.READ)
    class ReadController {
      list(this: void) {}
    }
    expect(
      guard.canActivate(
        httpContext(
          { user: { role: 'USER' } },
          ReadController.prototype.list,
          ReadController,
        ),
      ),
    ).toBe(true);
  });

  it('allows a valid method-level permission requirement', () => {
    expect(
      guard.canActivate(
        httpContext(
          { user: { role: 'USER' } },
          CommentsController.prototype.read,
          CommentsController,
        ),
      ),
    ).toBe(true);
  });

  it('continues to allow authentication-only controllers without a policy', () => {
    expect(guard.canActivate(httpContext({}))).toBe(true);
  });
});

import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { PERMISSION_METHOD_EXCEPTION_KEY } from '../../shared/constants/auth-metadata.constant.js';
import { Permission } from '../../shared/enums/permission.enum.js';
import { AuthorizationConfigurationException } from '../../shared/errors/authorization-configuration.exception.js';
import { validatePermissionMethod } from '../utils/validate-permission-method.js';

describe('HTTP method permission conventions', () => {
  const reflector = new Reflector();

  function route(method: unknown) {
    class Controller {
      route(this: void) {}
    }
    const handler = Controller.prototype.route;
    Reflect.defineMetadata(PATH_METADATA, '', handler);
    Reflect.defineMetadata(METHOD_METADATA, method, handler);
    return { controller: Controller, handler };
  }

  const conventions = [
    { method: RequestMethod.GET, permission: Permission.READ },
    { method: RequestMethod.HEAD, permission: Permission.READ },
    { method: RequestMethod.POST, permission: Permission.CREATE },
    { method: RequestMethod.PUT, permission: Permission.UPDATE },
    { method: RequestMethod.PATCH, permission: Permission.UPDATE },
    { method: RequestMethod.DELETE, permission: Permission.DELETE },
  ];

  it.each(conventions)(
    'accepts $method with $permission',
    ({ method, permission }) => {
      const { controller, handler } = route(method);
      expect(() =>
        validatePermissionMethod(reflector, controller, handler, [permission]),
      ).not.toThrow();
    },
  );

  it.each(conventions)(
    'rejects $method without $permission',
    ({ method, permission }) => {
      const { controller, handler } = route(method);
      const incorrect =
        permission === Permission.READ ? Permission.DELETE : Permission.READ;
      expect(() =>
        validatePermissionMethod(reflector, controller, handler, [incorrect]),
      ).toThrow(
        `Controller.route uses ${RequestMethod[method]} but does not declare Permission.${permission}.`,
      );
    },
  );

  it('allows additional explicit requirements alongside the conventional action', () => {
    const { controller, handler } = route(RequestMethod.GET);
    expect(() =>
      validatePermissionMethod(reflector, controller, handler, [
        Permission.READ,
        Permission.DELETE,
      ]),
    ).not.toThrow();
  });

  it.each([undefined, []].map((declared) => ({ declared })))(
    'skips a route without required permissions: $declared',
    ({ declared }) => {
      const { controller, handler } = route(RequestMethod.OPTIONS);
      expect(() =>
        validatePermissionMethod(reflector, controller, handler, declared),
      ).not.toThrow();
    },
  );

  it('ignores helper methods that are not HTTP routes', () => {
    const { controller, handler } = route(RequestMethod.GET);
    Reflect.deleteMetadata(PATH_METADATA, handler);
    expect(() =>
      validatePermissionMethod(reflector, controller, handler, [
        Permission.DELETE,
      ]),
    ).not.toThrow();
  });

  it('requires HTTP method metadata on a declared route', () => {
    const { controller, handler } = route(RequestMethod.GET);
    Reflect.deleteMetadata(METHOD_METADATA, handler);
    expect(() =>
      validatePermissionMethod(reflector, controller, handler, [
        Permission.READ,
      ]),
    ).toThrow('Controller.route has no HTTP method metadata.');
  });

  it.each([undefined, null, 'GET', 999, {}].map((method) => ({ method })))(
    'rejects malformed HTTP method metadata: $method',
    ({ method }) => {
      const { controller, handler } = route(method);
      expect(() =>
        validatePermissionMethod(reflector, controller, handler, [
          Permission.READ,
        ]),
      ).toThrow(AuthorizationConfigurationException);
    },
  );

  it.each([RequestMethod.OPTIONS, RequestMethod.ALL])(
    'requires an explicit exception for unmapped method %s',
    (method) => {
      const { controller, handler } = route(method);
      expect(() =>
        validatePermissionMethod(reflector, controller, handler, [
          Permission.READ,
        ]),
      ).toThrow('has no standard CRUD permission mapping');
    },
  );

  it.each([RequestMethod.POST, RequestMethod.OPTIONS, RequestMethod.ALL])(
    'accepts a documented custom operation for method %s',
    (method) => {
      const { controller, handler } = route(method);
      Reflect.defineMetadata(
        PERMISSION_METHOD_EXCEPTION_KEY,
        'Search accepts a filter body.',
        handler,
      );
      expect(() =>
        validatePermissionMethod(reflector, controller, handler, [
          Permission.READ,
        ]),
      ).not.toThrow();
    },
  );

  it('rejects exceptions declared on a controller', () => {
    const { controller, handler } = route(RequestMethod.GET);
    Reflect.defineMetadata(
      PERMISSION_METHOD_EXCEPTION_KEY,
      'Applies to every route.',
      controller,
    );
    expect(() =>
      validatePermissionMethod(reflector, controller, handler, [
        Permission.READ,
      ]),
    ).toThrow(
      'Controller: declare permission method exceptions on route methods.',
    );
  });

  it.each(
    [undefined, null, 123, '', ' \t\n', {}].map((reason) => ({ reason })),
  )('rejects missing or invalid exception reasons: $reason', ({ reason }) => {
    const { controller, handler } = route(RequestMethod.POST);
    Reflect.defineMetadata(PERMISSION_METHOD_EXCEPTION_KEY, reason, handler);
    expect(() =>
      validatePermissionMethod(reflector, controller, handler, [
        Permission.READ,
      ]),
    ).toThrow(
      'Controller.route: permission method exceptions require a non-empty reason.',
    );
  });

  it('rejects an exception without explicit permissions', () => {
    const { controller, handler } = route(RequestMethod.POST);
    Reflect.defineMetadata(
      PERMISSION_METHOD_EXCEPTION_KEY,
      'Search accepts a filter body.',
      handler,
    );
    expect(() =>
      validatePermissionMethod(reflector, controller, handler, undefined),
    ).toThrow(
      'Controller.route has a permission method exception but no method permissions.',
    );
  });

  it('does not let an exception hide missing HTTP method metadata', () => {
    const { controller, handler } = route(RequestMethod.POST);
    Reflect.defineMetadata(
      PERMISSION_METHOD_EXCEPTION_KEY,
      'Search accepts a filter body.',
      handler,
    );
    Reflect.deleteMetadata(METHOD_METADATA, handler);
    expect(() =>
      validatePermissionMethod(reflector, controller, handler, [
        Permission.READ,
      ]),
    ).toThrow('Controller.route has no HTTP method metadata.');
  });
});

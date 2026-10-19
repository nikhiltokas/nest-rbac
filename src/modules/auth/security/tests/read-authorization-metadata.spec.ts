import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { AuthorizationConfigurationException } from '../../shared/errors/authorization-configuration.exception.js';
import { readAuthorizationMetadata } from '../utils/read-authorization-metadata.js';

describe('readAuthorizationMetadata', () => {
  const reflector = new Reflector();
  const isBoolean = (value: unknown): value is boolean =>
    typeof value === 'boolean';

  it('returns undefined for a missing declaration', () => {
    class Controller {}
    expect(
      readAuthorizationMetadata(reflector, 'flag', Controller, isBoolean),
    ).toBeUndefined();
  });

  it.each([true, false])(
    'returns a valid declaration, including %s',
    (value) => {
      class Controller {}
      Reflect.defineMetadata('flag', value, Controller);
      expect(
        readAuthorizationMetadata(reflector, 'flag', Controller, isBoolean),
      ).toBe(value);
    },
  );

  it.each([undefined, null, 'true', 1, [], {}].map((value) => ({ value })))(
    'rejects a present invalid declaration: $value',
    ({ value }) => {
      class Controller {}
      Reflect.defineMetadata('flag', value, Controller);
      expect(() =>
        readAuthorizationMetadata(reflector, 'flag', Controller, isBoolean),
      ).toThrow(AuthorizationConfigurationException);
      expect(() =>
        readAuthorizationMetadata(reflector, 'flag', Controller, isBoolean),
      ).toThrow('Controller has invalid flag metadata.');
    },
  );

  it('includes the supplied route name in diagnostics', () => {
    class Controller {
      route(this: void) {}
    }
    Reflect.defineMetadata('flag', null, Controller.prototype.route);
    expect(() =>
      readAuthorizationMetadata(
        reflector,
        'flag',
        Controller.prototype.route,
        isBoolean,
        'Controller.route',
      ),
    ).toThrow('Controller.route has invalid flag metadata.');
  });

  it('reads metadata inherited from a base controller', () => {
    class BaseController {}
    class Controller extends BaseController {}
    Reflect.defineMetadata('flag', true, BaseController);
    expect(
      readAuthorizationMetadata(reflector, 'flag', Controller, isBoolean),
    ).toBe(true);
  });
});

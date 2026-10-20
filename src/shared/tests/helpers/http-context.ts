import type { ExecutionContext, Type } from '@nestjs/common';

export function httpContext(
  request: unknown,
  handler: () => unknown = () => {},
  controller: Type = class {},
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
    getHandler: () => handler,
    getClass: () => controller,
  } as unknown as ExecutionContext;
}

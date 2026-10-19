import type { Reflector } from '@nestjs/core';
import { AuthorizationConfigurationException } from '../../shared/errors/authorization-configuration.exception.js';

/**
 * Reads a decorator declaration from a controller or route method.
 * Missing declarations return undefined. Invalid declarations throw an error.
 */
export function readAuthorizationMetadata<MetadataValue>(
  reflector: Reflector,
  metadataKey: string,
  target: Function,
  isValidMetadata: (value: unknown) => value is MetadataValue,
  targetName = target.name,
): MetadataValue | undefined {
  const hasDeclaration = Reflect.hasMetadata(metadataKey, target);
  if (!hasDeclaration) {
    return undefined;
  }

  const metadata = reflector.get<unknown>(metadataKey, target);
  if (!isValidMetadata(metadata)) {
    throw new AuthorizationConfigurationException(
      `${targetName} has invalid ${metadataKey} metadata.`,
    );
  }

  return metadata;
}

import {
  Injectable,
  InternalServerErrorException,
  type OnApplicationBootstrap,
} from '@nestjs/common';

import { PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { PermissionConfigurationError } from '../errors/permission-configuration.error.js';
import { resolvePermissionRequirement } from '../utils/resolve-permission-requirement.js';

@Injectable()
export class PermissionRoutesValidator implements OnApplicationBootstrap {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  onApplicationBootstrap(): void {
    const errors: string[] = [];
    for (const {
      metatype: controller,
    } of this.discoveryService.getControllers()) {
      if (!controller) continue;
      for (const name of this.metadataScanner.getAllMethodNames(
        controller.prototype,
      )) {
        const handler = controller.prototype[name];
        if (!Reflect.hasMetadata(PATH_METADATA, handler)) continue;

        try {
          resolvePermissionRequirement(this.reflector, controller, handler);
        } catch (error) {
          if (!(error instanceof InternalServerErrorException)) throw error;
          errors.push(error.message);
        }
      }
    }

    if (errors.length) {
      throw new PermissionConfigurationError(errors);
    }
  }
}

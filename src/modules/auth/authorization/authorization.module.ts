import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { PermissionsGuard } from './guards/permissions.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { AuthorizationService } from './services/authorization.service.js';
import { PermissionRoutesValidator } from './validators/permission-routes.validator.js';

@Module({
  imports: [DiscoveryModule],
  providers: [
    AuthorizationService,
    PermissionsGuard,
    RolesGuard,
    PermissionRoutesValidator,
  ],
  exports: [AuthorizationService, PermissionsGuard, RolesGuard],
})
export class AuthorizationModule {}

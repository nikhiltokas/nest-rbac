import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../../../prisma/prisma.module.js';
import { CredentialsModule } from '../credentials/credentials.module.js';
import { JwtAuthGuard } from './guards/jwt.auth.guard.js';
import { LocalAuthGuard } from './guards/local.auth.guard.js';
import { PermissionsGuard } from './guards/permissions.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { PermissionRoutesValidator } from './validators/permission-routes.validator.js';

@Module({
  imports: [
    DiscoveryModule,
    CredentialsModule,
    PrismaModule,
    PassportModule.register({ session: false }),
  ],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    LocalAuthGuard,
    RolesGuard,
    PermissionsGuard,
    PermissionRoutesValidator,
  ],
  exports: [
    JwtAuthGuard,
    LocalAuthGuard,
    RolesGuard,
    PermissionsGuard,
    PassportModule,
  ],
})
export class SecurityModule {}

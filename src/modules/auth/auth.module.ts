import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CredentialsModule } from './credentials/credentials.module.js';
import { LoginModule } from './login/login.module.js';
import { RegisterModule } from './register/register.module.js';
import { SecurityModule } from './security/security.module.js';
import { JwtAuthGuard } from './security/guards/jwt.auth.guard.js';

@Module({
  imports: [RegisterModule, LoginModule, CredentialsModule, SecurityModule],
  providers: [{ provide: APP_GUARD, useExisting: JwtAuthGuard }],
  exports: [SecurityModule, CredentialsModule],
})
export class AuthModule {}

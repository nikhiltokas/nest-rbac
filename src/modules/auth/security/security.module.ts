import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../../../prisma/prisma.module.js';
import { CredentialsModule } from '../credentials/credentials.module.js';
import { JwtAuthGuard } from './guards/jwt.auth.guard.js';
import { LocalAuthGuard } from './guards/local.auth.guard.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Module({
  imports: [
    CredentialsModule,
    PrismaModule,
    PassportModule.register({ session: false }),
  ],
  providers: [JwtStrategy, JwtAuthGuard, LocalAuthGuard],
  exports: [JwtAuthGuard, LocalAuthGuard, PassportModule],
})
export class SecurityModule {}

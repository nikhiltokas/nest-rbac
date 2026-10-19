import 'dotenv/config';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../../prisma/prisma.module.js';
import { getJwtSecret, JWT_ALGORITHM } from './config/jwt.config.js';
import { CredentialsService } from './services/credentials.service.js';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getJwtSecret(),
        signOptions: { expiresIn: '1h', algorithm: JWT_ALGORITHM },
        verifyOptions: { algorithms: [JWT_ALGORITHM] },
      }),
    }),
  ],
  providers: [CredentialsService],
  exports: [CredentialsService, JwtModule],
})
export class CredentialsModule {}

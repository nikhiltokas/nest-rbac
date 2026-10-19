import { Module } from '@nestjs/common';
import { CredentialsModule } from '../credentials/credentials.module.js';
import { SecurityModule } from '../security/security.module.js';
import { LoginService } from './login.service.js';
import { LoginController } from './login.controller.js';

@Module({
  imports: [CredentialsModule, SecurityModule],
  controllers: [LoginController],
  providers: [LoginService],
})
export class LoginModule {}

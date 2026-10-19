import { Injectable } from '@nestjs/common';
import { CredentialsService } from '../credentials/services/credentials.service.js';
import type { PublicUser } from '../credentials/contracts/credentials.types.js';

@Injectable()
export class LoginService {
  constructor(private readonly credentialsService: CredentialsService) {}

  login(user: PublicUser) {
    return this.credentialsService.createSession(user);
  }
}

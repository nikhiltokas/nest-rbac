import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';

import type { AuthenticatedRequest } from '../../credentials/contracts/credentials.types.js';
import { CredentialsService } from '../../credentials/services/credentials.service.js';

@Injectable()
export class LocalAuthGuard implements CanActivate {
  constructor(private readonly credentialsService: CredentialsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { email, password } = request.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new UnauthorizedException('Email and password are required');
    }

    request.user = await this.credentialsService.validateUser({
      email: email.trim().toLowerCase(),
      password,
    });
    return true;
  }
}

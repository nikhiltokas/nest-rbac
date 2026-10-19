import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CredentialsService } from '../credentials/services/credentials.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import { hashPassword } from '../credentials/utils/password.js';
import type { PublicUser } from '../credentials/contracts/credentials.types.js';
import { PUBLIC_USER_FIELDS } from '../credentials/constants/public-user-fields.constant.js';

@Injectable()
export class RegisterService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly credentialsService: CredentialsService,
  ) {}

  async register(input: RegisterDto) {
    const passwordHash = await hashPassword(input.password);
    let user: PublicUser;

    try {
      user = await this.prismaService.db.orm.public.User.select(
        ...PUBLIC_USER_FIELDS,
      ).create({
        firstName: input.firstName,
        lastName: input.lastName ?? null,
        username: input.username,
        email: input.email,
        passwordHash,
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'sqlState' in error &&
        error.sqlState === '23505'
      ) {
        throw new ConflictException('Email or username is already registered');
      }
      throw error;
    }

    return this.credentialsService.createSession(user);
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { PUBLIC_USER_FIELDS } from '../constants/public-user-fields.constant.js';
import type { PublicUser } from '../contracts/credentials.types.js';
import type { CredentialsDto } from '../dto/credentials.dto.js';
import { verifyPassword } from '../utils/password.js';

@Injectable()
export class CredentialsService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async validateUser(input: CredentialsDto): Promise<PublicUser> {
    const record = await this.prismaService.db.orm.public.User.where({
      email: input.email,
    })
      .select(...PUBLIC_USER_FIELDS, 'passwordHash')
      .first();

    if (
      !record?.passwordHash ||
      !(await verifyPassword(input.password, record.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { passwordHash: _passwordHash, ...user } = record;
    return user;
  }

  async createSession(user: PublicUser) {
    return {
      accessToken: await this.jwtService.signAsync({ sub: user.id }),
      user,
    };
  }
}

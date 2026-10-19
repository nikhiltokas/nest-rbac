import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { isUUID } from 'class-validator';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../../prisma/prisma.service.js';

import {
  getJwtSecret,
  JWT_ALGORITHM,
} from '../../credentials/config/jwt.config.js';
import { PUBLIC_USER_FIELDS } from '../../credentials/constants/public-user-fields.constant.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prismaService: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: getJwtSecret(),
      algorithms: [JWT_ALGORITHM],
      ignoreExpiration: false,
    });
  }

  async validate(payload: unknown) {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('sub' in payload) ||
      typeof payload.sub !== 'string' ||
      !isUUID(payload.sub)
    ) {
      throw new UnauthorizedException('Invalid token subject');
    }

    const user = await this.prismaService.db.orm.public.User.select(
      ...PUBLIC_USER_FIELDS,
    ).first({ id: payload.sub });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return user;
  }
}

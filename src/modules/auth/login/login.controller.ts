import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import type { PublicUser } from '../credentials/contracts/credentials.types.js';
import { CurrentUser } from '../shared/decorators/current.user.decorator.js';
import { Public } from '../shared/decorators/public.decorator.js';
import { LocalAuthGuard } from '../security/guards/local.auth.guard.js';
import { LoginDto } from './dto/login.dto.js';
import { LoginService } from './login.service.js';

@Controller('auth')
export class LoginController {
  constructor(private readonly loginService: LoginService) {}

  @Post('login')
  @Public()
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  login(@Body() _input: LoginDto, @CurrentUser() user: PublicUser) {
    return this.loginService.login(user);
  }
}

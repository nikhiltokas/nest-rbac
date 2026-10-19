import { Body, Controller, Post } from '@nestjs/common';
import { RegisterService } from './register.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { Public } from '../shared/decorators/public.decorator.js';

@Controller('auth')
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @Post('register')
  @Public()
  register(@Body() input: RegisterDto) {
    return this.registerService.register(input);
  }
}

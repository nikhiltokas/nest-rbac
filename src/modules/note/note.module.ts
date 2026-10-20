import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthorizationModule } from '../auth/authorization/authorization.module.js';
import { NoteController } from './note.controller.js';
import { NoteService } from './note.service.js';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [NoteController],
  providers: [NoteService],
})
export class NoteModule {}

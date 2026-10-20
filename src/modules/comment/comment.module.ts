import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthorizationModule } from '../auth/authorization/authorization.module.js';
import { CommentController } from './comment.controller.js';
import { CommentService } from './comment.service.js';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [CommentController],
  providers: [CommentService],
})
export class CommentModule {}

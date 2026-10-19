import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module.js';
import { CommentModule } from './modules/comment/comment.module.js';
import { NoteModule } from './modules/note/note.module.js';

@Module({
  imports: [AuthModule, CommentModule, NoteModule],
})
export class AppModule {}

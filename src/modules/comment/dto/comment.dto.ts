import { IsString, Length, Matches } from 'class-validator';
import type { Models } from '../../../prisma/generated/contract.d.js';

export class CommentDto {
  @IsString()
  @Length(1, 250)
  @Matches(/\S/)
  content: Models.public_Comment['content'];
}

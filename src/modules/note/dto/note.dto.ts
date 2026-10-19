import { IsString, Length, Matches } from 'class-validator';
import type { Models } from '../../../prisma/generated/contract.d.js';

export class NoteDto {
  @IsString()
  @Length(1, 100)
  @Matches(/\S/)
  title: Models.public_Note['title'];

  @IsString()
  @Length(1, 1000)
  @Matches(/\S/)
  content: Models.public_Note['content'];
}

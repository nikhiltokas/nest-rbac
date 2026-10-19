import { IsOptional, IsString, Length, Matches } from 'class-validator';
import type { Models } from '../../../../prisma/generated/contract.d.js';
import { CredentialsDto } from '../../credentials/dto/credentials.dto.js';

export class RegisterDto extends CredentialsDto {
  @IsString()
  @Length(1, 50)
  @Matches(/\S/)
  firstName: Models.public_User['firstName'];

  @IsOptional()
  @IsString()
  @Length(1, 50)
  @Matches(/\S/)
  lastName?: Models.public_User['lastName'];

  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username: string;
}

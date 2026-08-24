import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, Matches, MinLength } from 'class-validator';
import { NO_WHITESPACE, NO_WHITESPACE_MESSAGE } from '../../auth/dto/email-auth.dto';

export class CreateAdminDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  lastName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'secret123', minLength: 6 })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  @Matches(NO_WHITESPACE, { message: NO_WHITESPACE_MESSAGE })
  password: string;
}

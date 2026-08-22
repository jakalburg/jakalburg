import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleOneTapDto {
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...',
    description:
      'The ID-token credential string returned by Google Identity Services (One Tap / button).',
  })
  @IsString()
  @IsNotEmpty()
  credential: string;
}

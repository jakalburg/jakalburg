import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFabricDto {
  @ApiProperty({ example: 'Mercerised cotton piqué' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'Breathable, holds its shape.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

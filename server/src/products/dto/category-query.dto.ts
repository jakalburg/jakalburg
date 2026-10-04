import { ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

/**
 * Query for GET /products/meta/categories.
 *
 * Its own DTO rather than reusing ProductQueryDto: that one carries pagination
 * and a dozen filters that mean nothing here, and the global ValidationPipe
 * runs with `whitelist`, so a narrow DTO is also what keeps stray params out.
 */
export class CategoryQueryDto {
  @ApiPropertyOptional({
    enum: Gender,
    description:
      'Scope to the categories a shopper can browse under this gender (active products only).',
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}

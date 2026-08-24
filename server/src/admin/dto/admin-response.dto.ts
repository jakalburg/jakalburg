import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Minimal profile shape the admin table/edit form reads (profiles[0]). */
export class AdminProfileDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  firstName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastName?: string | null;
}

/**
 * Safe admin projection — deliberately never includes `password` or
 * `tokenVersion`. Mirrors what admin.service selects.
 */
export class AdminResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  email?: string | null;

  @ApiProperty({ example: 'admin' })
  role: string;

  @ApiProperty()
  disabled: boolean;

  @ApiProperty({ type: [AdminProfileDto] })
  profiles: AdminProfileDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

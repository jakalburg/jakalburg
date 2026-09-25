import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../../common/pagination';

export class CollectionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'summer-essentials' })
  slug: string;

  @ApiProperty({ example: 'Summer Essentials' })
  title: string;

  @ApiPropertyOptional({ nullable: true, example: 'Linen, cotton, ease.' })
  subtitle?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Cover photo URL.' })
  image?: string | null;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty({ example: true })
  enabled: boolean;

  @ApiProperty({ example: 0 })
  order: number;

  @ApiProperty({ example: 12, description: 'Products tagged with this collection slug.' })
  productCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

/** Paginated collection list envelope. */
export class CollectionListResponseDto extends PaginatedResponseDto<CollectionResponseDto> {
  @ApiProperty({ type: [CollectionResponseDto] })
  declare data: CollectionResponseDto[];
}

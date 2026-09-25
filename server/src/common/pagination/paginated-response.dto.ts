import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger shape of the pagination envelope. Concrete list DTOs extend this and
 * re-declare `data` with their own item type:
 *
 * ```ts
 * export class CouponListResponseDto extends PaginatedResponseDto<CouponResponseDto> {
 *   @ApiProperty({ type: [CouponResponseDto] })
 *   declare data: CouponResponseDto[];
 * }
 * ```
 */
export abstract class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Rows for the requested page.' })
  data: T[];

  @ApiProperty({ description: 'Total rows matching the filters.', example: 125 })
  total: number;

  @ApiProperty({ description: 'Row offset of the first returned row.', example: 0 })
  skip: number;

  @ApiProperty({ description: 'Rows requested per page.', example: 10 })
  take: number;

  @ApiProperty({ description: '1-based page number.', example: 1 })
  page: number;

  @ApiProperty({ description: 'Alias for `take`.', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Number of pages available.', example: 13 })
  totalPages: number;

  @ApiProperty({ description: 'Whether more rows follow this page.', example: true })
  hasMore: boolean;

  @ApiProperty({ description: 'Alias for `hasMore`.', example: true })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Whether rows precede this page.', example: false })
  hasPreviousPage: boolean;
}

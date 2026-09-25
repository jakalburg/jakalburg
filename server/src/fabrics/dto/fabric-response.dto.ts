import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../../common/pagination';

export class FabricResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

/** Paginated fabric list envelope. */
export class FabricListResponseDto extends PaginatedResponseDto<FabricResponseDto> {
  @ApiProperty({ type: [FabricResponseDto] })
  declare data: FabricResponseDto[];
}

import { ApiProperty, PartialType } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsBoolean, IsString } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

/** Every field optional — a partial patch of a product. */
export class UpdateProductDto extends PartialType(CreateProductDto) {}

/** Toggle a single product's storefront visibility. */
export class UpdateProductStatusDto {
  @ApiProperty({ example: true, description: 'Storefront visibility.' })
  @IsBoolean()
  isActive: boolean;
}

/** Enable/disable many products at once. */
export class BulkProductStatusDto {
  @ApiProperty({ type: [String], description: 'Product ids to update.' })
  @IsString({ each: true })
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  productIds: string[];

  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}

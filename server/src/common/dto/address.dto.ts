import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * A shipping address, shaped to the client's `Address` interface
 * (client/src/types/index.ts). Stored verbatim as JSON — on the Order as a
 * frozen `shippingAddress` snapshot, and in the address history on Profile.
 */
export class AddressDto {
  @ApiPropertyOptional({
    example: 'addr-1723800000000',
    description: 'Client-generated id (present for saved/history addresses).',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'Amit Sharma' })
  @IsString()
  @MinLength(1)
  fullName: string;

  @ApiProperty({ example: '12 Atelier Lane' })
  @IsString()
  @MinLength(1)
  line1: string;

  @ApiPropertyOptional({ example: 'Bandra West' })
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsString()
  @MinLength(1)
  city: string;

  @ApiProperty({ example: 'Maharashtra' })
  @IsString()
  @MinLength(1)
  state: string;

  @ApiProperty({ example: '400050' })
  @IsString()
  @MinLength(1)
  pincode: string;

  @ApiProperty({ example: '+91 98200 00000' })
  @IsString()
  @MinLength(1)
  phone: string;

  @ApiPropertyOptional({ example: true, description: 'Whether this is the default address.' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

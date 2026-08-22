import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { AddressDto } from '../../common/dto/address.dto';

/** Full-replace payload: the authoritative list of saved addresses for a user
 *  (the client mirrors its whole address book here). */
export class PutAddressesDto {
  @ApiProperty({ type: [AddressDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses: AddressDto[];
}

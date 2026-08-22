import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserWithRelations } from '../types/database.types';
import { AddressDto } from '../common/dto/address.dto';
import { AddressesService } from './addresses.service';
import { PutAddressesDto } from './dto/addresses.dto';

@ApiTags('Addresses')
@ApiBearerAuth('jwt')
@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  /** The authenticated user's saved addresses. */
  @Get()
  @ApiOperation({ summary: "Get the current user's saved addresses" })
  @ApiOkResponse({ description: 'The address history.', type: [AddressDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  getAddresses(@Req() req: Request): Promise<AddressDto[]> {
    const user = req.user as UserWithRelations;
    return this.addressesService.getAddresses(user.id);
  }

  /** Replace the whole address book (the client mirrors its list here). */
  @Put()
  @ApiOperation({
    summary: 'Replace the address book',
    description:
      "Overwrites the user's saved addresses with exactly the supplied list. " +
      'The default address is taken from whichever entry has `isDefault: true`.',
  })
  @ApiOkResponse({ description: 'The updated address history.', type: [AddressDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  replaceAddresses(
    @Req() req: Request,
    @Body() dto: PutAddressesDto,
  ): Promise<AddressDto[]> {
    const user = req.user as UserWithRelations;
    return this.addressesService.replaceAddresses(user.id, dto.addresses);
  }
}

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
import { CartService } from './cart.service';
import { CartResponseDto, PutCartDto } from './dto/cart.dto';

@ApiTags('Cart')
@ApiBearerAuth('jwt')
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /** The authenticated user's cart, with live product data. */
  @Get()
  @ApiOperation({ summary: "Get the current user's cart" })
  @ApiOkResponse({ description: 'The cart.', type: CartResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  getCart(@Req() req: Request): Promise<CartResponseDto> {
    const user = req.user as UserWithRelations;
    return this.cartService.getCart(user.id);
  }

  /** Replace the cart with the given lines (the client mirrors its whole cart
   *  here; an empty array clears it). */
  @Put()
  @ApiOperation({
    summary: 'Replace the cart',
    description:
      "Overwrites the user's cart with exactly the supplied lines. Used to " +
      'mirror the client cart and to merge a guest cart on login. Empty array clears it.',
  })
  @ApiOkResponse({ description: 'The updated cart.', type: CartResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  replaceCart(
    @Req() req: Request,
    @Body() dto: PutCartDto,
  ): Promise<CartResponseDto> {
    const user = req.user as UserWithRelations;
    return this.cartService.replaceCart(user.id, dto.items);
  }
}

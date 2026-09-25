import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserWithRelations } from '../types/database.types';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  OrderListResponseDto,
  OrderResponseDto,
} from './dto/order.dto';
import { PaginationQueryDto } from '../common/pagination';

@ApiTags('Orders')
@ApiBearerAuth('jwt')
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /** Place an order (checkout). Totals are computed server-side from live prices. */
  @Post()
  @ApiOperation({
    summary: 'Create an order',
    description:
      'Places an order for the authenticated user. Prices and item snapshots ' +
      'come from live products; the cart is cleared on success.',
  })
  @ApiCreatedResponse({ description: 'The created order.', type: OrderResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed or a product is unavailable.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  create(
    @Req() req: Request,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    const user = req.user as UserWithRelations;
    return this.ordersService.create(user.id, dto);
  }

  /** The authenticated user's order history (newest first, paginated). */
  @Get('me')
  @ApiOperation({
    summary: "Get the current user's order history",
    description: 'Paginated — defaults to page 1 × 10 orders.',
  })
  @ApiOkResponse({ description: 'The order history.', type: OrderListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  findMine(
    @Req() req: Request,
    @Query() query: PaginationQueryDto,
  ): Promise<OrderListResponseDto> {
    const user = req.user as UserWithRelations;
    return this.ordersService.findMine(user.id, query);
  }

  /** A single order by its number (only the owner can read it). */
  @Get(':orderNumber')
  @ApiOperation({ summary: 'Get one of the current user\'s orders by number' })
  @ApiOkResponse({ description: 'The order.', type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'No such order for this user.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  findOne(
    @Req() req: Request,
    @Param('orderNumber') orderNumber: string,
  ): Promise<OrderResponseDto> {
    const user = req.user as UserWithRelations;
    return this.ordersService.findOne(user.id, orderNumber);
  }
}

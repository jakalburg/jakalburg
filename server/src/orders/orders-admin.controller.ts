import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';

/**
 * OrdersAdminController — the admin `/logistics?tab=orders` screen (list, detail,
 * status transitions, delete). A customer is a non-admin User; these routes are
 * store-wide (every user's orders), unlike the owner-scoped OrdersController.
 *
 * Prefix is `admin/orders` (not `orders/*`) on purpose: the guarded
 * OrdersController owns `GET orders/:orderNumber`, which would otherwise shadow
 * an `orders/admin` list route.
 *
 * NOTE: routes are UNGUARDED for now, matching the product / fabric / admin /
 * customer write routes (the admin uses a mock auth session, realApi sends no
 * JWT). Add JwtAuthGuard + RolesGuard('admin') before any non-local deployment.
 *
 * GUARDED: class-level @AdminOnly() — store-wide order data/mutations are admin-only.
 */
@ApiTags('Orders (Admin)')
@AdminOnly()
@Controller('admin/orders')
export class OrdersAdminController {
  constructor(private readonly ordersService: OrdersService) {}

  /** One page of orders with the admin table's shape, filtered + sorted in SQL. */
  @Get()
  @ApiOperation({
    summary: 'Admin: list orders (paginated)',
    description:
      'Defaults to page 1 × 10 orders; `limit` is capped at 100. `search` ' +
      'matches order number, customer email and customer name.',
  })
  @ApiOkResponse({
    description:
      'Paged orders envelope: {data,items,total,skip,take,page,limit,totalPages,hasMore,…}.',
  })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
  ) {
    return this.ordersService.adminFindAll({
      page,
      limit,
      skip,
      take,
      status,
      search,
      sort,
    });
  }

  /** One order with the fuller detail shape. */
  @Get(':id')
  @ApiOperation({ summary: 'Admin: get one order' })
  findOne(@Param('id') id: string) {
    return this.ordersService.adminFindOne(id);
  }

  /** Same detail shape — the admin detail page hits `:id/details`. */
  @Get(':id/details')
  @ApiOperation({ summary: 'Admin: get one order (detail view)' })
  findOneDetails(@Param('id') id: string) {
    return this.ordersService.adminFindOne(id);
  }

  /** Update an order's status. */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Admin: update order status' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; notifyCustomer?: boolean },
  ) {
    return this.ordersService.adminUpdateStatus(
      id,
      body?.status,
      body?.notifyCustomer,
    );
  }

  /** Accept an order (→ processing). */
  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Admin: accept an order' })
  confirm(@Param('id') id: string) {
    return this.ordersService.adminConfirm(id);
  }

  /** Reject an order (unsupported by the lean store — returns 400). */
  @Patch(':id/reject')
  @ApiOperation({ summary: 'Admin: reject an order' })
  reject(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.ordersService.adminReject(id, body?.reason);
  }

  /** Mark an order shipped (status only — no tracking columns on this model). */
  @Patch(':id/ship')
  @ApiOperation({ summary: 'Admin: mark an order shipped' })
  ship(@Param('id') id: string, @Body() body: unknown) {
    return this.ordersService.adminShip(id, body);
  }

  /** (Re-)send one order to the Google Sheet — the detail page's "Add to Sheet"
   *  button. Resolves with `{success, skipped, message}` either way; a Sheets
   *  failure is a message on the page, not a 500. */
  @Post(':id/sync-sheet')
  @ApiOperation({ summary: 'Admin: sync an order to Google Sheets' })
  syncSheet(@Param('id') id: string) {
    return this.ordersService.adminSyncSheet(id);
  }

  /** Permanently delete an order. `removeFromSheet=false` keeps the row in the
   *  Google Sheet as a paper trail; by default the row goes too. */
  @Delete(':id')
  @ApiOperation({ summary: 'Admin: delete an order' })
  remove(
    @Param('id') id: string,
    @Query('removeFromSheet') removeFromSheet?: string,
  ) {
    return this.ordersService.adminRemove(id, removeFromSheet !== 'false');
  }
}

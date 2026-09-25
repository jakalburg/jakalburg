import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { PaginationQueryDto } from '../common/pagination';

/**
 * CustomersController — the admin Customers screen (list + detail + delete).
 * A customer is a non-admin User; the detail embeds the customer's order history.
 *
 * NOTE: routes are UNGUARDED for now, matching the product / fabric / admin
 * write routes (the admin uses a mock auth session, realApi sends no JWT). Add
 * JwtAuthGuard + RolesGuard('admin') before any non-local deployment.
 *
 * GUARDED: class-level @AdminOnly() — customer PII/order history is admin-only.
 */
@ApiTags('Customers')
@AdminOnly()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  /** One page of customers with order-count + total-spend aggregates. */
  @Get()
  @ApiOperation({
    summary: 'Admin: list customers (paginated)',
    description: 'Defaults to page 1 × 10 customers; `limit` is capped at 100.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Free text over name, email and phone.',
  })
  @ApiQuery({
    name: 'searchBy',
    required: false,
    enum: ['name'],
    description:
      "Set to 'name' to match `search` against the display name only " +
      '(used by the review-author picker). Defaults to name + email + phone.',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['name-asc', 'name-desc', 'orders-desc', 'spent-desc', 'joined-desc'],
    description: 'Defaults to newest-first.',
  })
  @ApiOkResponse({ description: 'Paged customers with aggregates.' })
  findAll(
    @Query() pagination: PaginationQueryDto,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('searchBy') searchBy?: string,
  ) {
    return this.customersService.findAll({
      ...pagination,
      search,
      sort,
      searchBy,
    });
  }

  /** One customer with a page of their recent order history. */
  @Get(':id')
  @ApiOperation({
    summary: 'Admin: get a customer (with recent orders)',
    description:
      'The embedded `orders` array is paginated (10 by default); ' +
      '`totalOrders` and `totalSpent` always cover the full history.',
  })
  @ApiOkResponse({ description: 'The customer.' })
  findOne(@Param('id') id: string, @Query() pagination: PaginationQueryDto) {
    return this.customersService.findOne(id, pagination);
  }

  /** Delete a customer (cascades their orders and related rows). */
  @Delete(':id')
  @ApiOperation({ summary: 'Admin: delete a customer' })
  @ApiOkResponse({ description: 'Deleted.' })
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}

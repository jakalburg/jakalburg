import { Controller, Delete, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';

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

  /** List all customers with order-count + total-spend aggregates. */
  @Get()
  @ApiOperation({ summary: 'Admin: list all customers' })
  @ApiOkResponse({ description: 'Customers with aggregates.' })
  findAll() {
    return this.customersService.findAll();
  }

  /** One customer with embedded order history. */
  @Get(':id')
  @ApiOperation({ summary: 'Admin: get a customer (with order history)' })
  @ApiOkResponse({ description: 'The customer.' })
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  /** Delete a customer (cascades their orders and related rows). */
  @Delete(':id')
  @ApiOperation({ summary: 'Admin: delete a customer' })
  @ApiOkResponse({ description: 'Deleted.' })
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}

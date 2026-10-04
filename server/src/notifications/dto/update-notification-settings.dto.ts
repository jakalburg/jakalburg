import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Every field optional — the screen auto-saves and sends the whole set, but a
 * caller flipping one toggle shouldn't have to echo the other five back.
 *
 * The global ValidationPipe runs with `whitelist`, so anything not declared
 * here (a stray `userId` from the old mock payload, for instance) is stripped
 * before it reaches Prisma.
 */
export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ description: 'Email the owner on a new order' })
  @IsOptional()
  @IsBoolean()
  emailOrderPlaced?: boolean;

  @ApiPropertyOptional({ description: 'Email the customer when an order ships' })
  @IsOptional()
  @IsBoolean()
  emailOrderShipped?: boolean;

  @ApiPropertyOptional({
    description: 'Email the customer when an order is cancelled',
  })
  @IsOptional()
  @IsBoolean()
  emailOrderCancelled?: boolean;

  @ApiPropertyOptional({ description: 'Bell alert on a new order' })
  @IsOptional()
  @IsBoolean()
  inAppOrderPlaced?: boolean;

  @ApiPropertyOptional({ description: 'Bell alert when an order ships' })
  @IsOptional()
  @IsBoolean()
  inAppOrderShipped?: boolean;

  @ApiPropertyOptional({ description: 'Bell alert when an order is cancelled' })
  @IsOptional()
  @IsBoolean()
  inAppOrderCancelled?: boolean;
}

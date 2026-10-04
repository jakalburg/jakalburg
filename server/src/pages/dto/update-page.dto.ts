import { PartialType } from '@nestjs/swagger';
import { CreatePageDto } from './create-page.dto';

/** Every field optional — the admin form sends the whole set, but the
 *  storefront-facing status toggle patches just `status`. */
export class UpdatePageDto extends PartialType(CreatePageDto) {}

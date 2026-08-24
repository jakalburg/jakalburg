import { PartialType } from '@nestjs/swagger';
import { CreateAdminDto } from './create-admin.dto';

// All fields optional; validators still apply to any field that IS sent (e.g. a
// provided password must still be >= 6 chars). The admin edit form leaves
// `password` blank to keep the current one.
export class UpdateAdminDto extends PartialType(CreateAdminDto) {}

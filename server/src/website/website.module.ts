import { Module } from '@nestjs/common';
import { WebsiteController } from './website.controller';
import { WebsiteContactController } from './website-contact.controller';
import { WebsiteAboutController } from './website-about.controller';
import { WebsiteService } from './website.service';

@Module({
  controllers: [
    WebsiteController,
    WebsiteContactController,
    WebsiteAboutController,
  ],
  providers: [WebsiteService],
  exports: [WebsiteService],
})
export class WebsiteModule {}

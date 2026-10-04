import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

/**
 * Product categories. Exported because ProductsService defers the storefront
 * nav's category list to it — the nav needs the intersection of "has live
 * stock" (products) and "is offered" (this table), and that rule belongs in
 * one place.
 */
@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}

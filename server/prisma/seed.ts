/**
 * Idempotent product seed. Safe to run repeatedly:
 *  - each product is upserted by its unique `slug` (never duplicated);
 *  - its colour rows are replaced (delete + recreate) inside a transaction,
 *    so colours stay in sync with the source data without orphaning rows.
 *
 * NON-DESTRUCTIVE: this only writes/updates the demo products it owns. It
 * never truncates tables, drops schema, or touches users/auth data.
 *
 * Run with:  npm run db:seed
 */
import { PrismaClient, Gender } from '@prisma/client';
import { seedProducts } from './seed-data/products';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log(`Seeding ${seedProducts.length} products…`);

  for (const p of seedProducts) {
    // Fully-authoritative field set — reused for both create and update so a
    // re-seed overwrites any drifted values (e.g. a removed sale price → null).
    const data = {
      title: p.title,
      gender: p.gender as Gender,
      category: p.category,
      price: p.price,
      compareAtPrice: p.compareAtPrice ?? null,
      images: p.images,
      sizes: p.sizes,
      soldOutSizes: p.soldOutSizes ?? [],
      tags: p.tags,
      isNew: p.isNew ?? false,
      onSale: p.onSale ?? false,
      collection: p.collection ?? null,
      essential: p.essential ?? false,
      description: p.description,
      fabric: p.fabric,
      care: p.care,
      stock: p.stock,
    };

    await prisma.$transaction(async (tx) => {
      const record = await tx.product.upsert({
        where: { slug: p.slug },
        create: { id: p.id, slug: p.slug, ...data },
        update: data,
        select: { id: true },
      });

      // Replace colours so display order + values match the source exactly.
      await tx.productColor.deleteMany({ where: { productId: record.id } });
      if (p.colors.length) {
        await tx.productColor.createMany({
          data: p.colors.map((col, i) => ({
            productId: record.id,
            name: col.name,
            hex: col.hex,
            position: i,
          })),
        });
      }
    });

    console.log(`  ✓ ${p.slug}`);
  }

  const [productCount, colorCount] = await Promise.all([
    prisma.product.count(),
    prisma.productColor.count(),
  ]);
  console.log(
    `Done. Database now holds ${productCount} products and ${colorCount} colour rows.`,
  );
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

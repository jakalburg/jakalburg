/**
 * Seeds the storefront's editable static pages (About, Shipping, Returns,
 * Privacy, Terms, FAQ) from the copy that used to be hardcoded in the client.
 *
 * Same logic as PagesService.seedDefaults() and the admin's "Seed defaults"
 * button, but runnable from the CLI — useful when you aren't logged into the
 * admin, since that endpoint is @AdminOnly().
 *
 *   npm run db:seed:pages
 *
 * Idempotent: only creates a page whose slug is missing. An edited page is
 * NEVER overwritten.
 */
import { PrismaClient } from '@prisma/client';
import { DEFAULT_PAGES, toCreateInput } from '../src/pages/pages.defaults';

const prisma = new PrismaClient();

async function main() {
  let created = 0;

  for (const page of DEFAULT_PAGES) {
    const existing = await prisma.page.findUnique({
      where: { slug: page.slug },
    });

    if (existing) {
      console.log(`  = ${page.slug.padEnd(16)} already exists — left alone`);
      continue;
    }

    await prisma.page.create({ data: toCreateInput(page) });
    created++;
    console.log(`  + ${page.slug.padEnd(16)} created`);
  }

  const total = await prisma.page.count();
  console.log(`\nSeeded ${created} page(s). ${total} total.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

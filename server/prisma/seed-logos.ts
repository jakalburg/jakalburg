/**
 * Uploads the bundled brand marks to Cloudinary and writes their URLs onto the
 * Settings row, so the admin's Settings → Store screen opens with the real
 * logos already in place and can swap them through the normal image picker.
 *
 *   npm run db:seed:logos
 *
 * Source files are the ones committed under admin/public — logo.png (full
 * wordmark), mini_logo.png (compact mark, also used as the favicon).
 *
 * Idempotent in the way that matters: a mark that is ALREADY set is left alone,
 * so re-running this never clobbers a logo an admin uploaded. Pass --force to
 * re-upload and overwrite anyway.
 */
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';
import { DEFAULT_SETTINGS } from '../src/settings/settings.defaults';

const prisma = new PrismaClient();

/** Which bundled file backs which Settings column. */
const MARKS = [
  { field: 'logo', file: 'logo.png' },
  { field: 'miniLogo', file: 'mini_logo.png' },
  { field: 'favicon', file: 'mini_logo.png' },
] as const;

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'admin', 'public');

const force = process.argv.includes('--force');

/** Upload one file into the shared "jakalburg/branding" folder. */
async function upload(file: string): Promise<string> {
  const filePath = path.join(PUBLIC_DIR, file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing source file: ${filePath}`);
  }

  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'jakalburg/branding',
    public_id: file.replace(/\.[^/.]+$/, ''),
    overwrite: true,
    invalidate: true,
  });

  // Match CloudinaryService: serve with f_auto,q_auto so browsers get a format
  // they can render at a sane weight (these sources are ~350KB PNGs).
  return result.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
}

async function main() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(
      'Cloudinary credentials missing — set CLOUDINARY_CLOUD_NAME, ' +
        'CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in server/.env.',
    );
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });

  // Create the row if this is a fresh database. Seed it with the same defaults
  // SettingsService.get() would have used, so running this script first doesn't
  // leave the store nameless.
  const existing =
    (await prisma.settings.findFirst()) ??
    (await prisma.settings.create({ data: DEFAULT_SETTINGS }));

  // One upload per distinct source file, shared by the fields that use it.
  const uploaded = new Map<string, string>();
  const data: Record<string, string> = {};

  for (const { field, file } of MARKS) {
    if (existing[field] && !force) {
      console.log(`  = ${field.padEnd(9)} already set — left alone`);
      continue;
    }

    if (!uploaded.has(file)) uploaded.set(file, await upload(file));
    data[field] = uploaded.get(file)!;
    console.log(`  + ${field.padEnd(9)} ${data[field]}`);
  }

  // Backfill any default copy (store name, tagline, SEO) that is still blank —
  // the row may predate those defaults, or have been created by an earlier run
  // of this script. A field an admin has filled in is never touched.
  for (const [field, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (typeof value !== 'string') continue;
    if (existing[field as keyof typeof existing]) continue;
    data[field] = value;
    console.log(`  + ${field.padEnd(9)} ${value.slice(0, 60)}`);
  }

  if (Object.keys(data).length === 0) {
    console.log('\nNothing to do. Re-run with --force to re-upload the marks.');
    return;
  }

  await prisma.settings.update({ where: { id: existing.id }, data });
  console.log(`\nSeeded ${Object.keys(data).length} field(s).`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());

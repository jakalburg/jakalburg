import { Prisma } from '@prisma/client';

/**
 * Seeded once, the first time anyone reads the store settings.
 *
 * These mirror the copy that was hardcoded in the storefront (Header, Footer
 * and components/seo.tsx) before this screen existed, so turning the feature on
 * changes nothing visually until an admin edits something.
 *
 * `logo`, `miniLogo` and `favicon` are deliberately absent: the storefront
 * falls back to its bundled /logo.png, /mini_logo.png and /favicon.png until
 * the real marks are uploaded. Run `npm run db:seed:logos` to push the bundled
 * files to Cloudinary and fill these in.
 */
export const DEFAULT_SETTINGS: Prisma.SettingsCreateInput = {
  storeName: 'Jakalburg',
  tagline: 'Considered wardrobe essentials in natural fibres, made to be kept.',

  seoTitle: 'Jakalburg — Considered wardrobe essentials',
  seoDescription:
    'Jakalburg is a considered ready-to-wear label — linen, cotton, wool and denim pieces built to last, in a restrained palette.',
  siteUrl: 'https://jakalburg.com',
};

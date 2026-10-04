import { Prisma } from '@prisma/client';

/**
 * The canonical home-page section list, seeded on first run and re-synced by
 * the admin's "Sync to site" button (see WebsiteService.seedDefaults).
 *
 * These types ARE the storefront's home page: `client/src/pages/index.tsx`
 * renders one block per enabled row, in `order`, and takes each block's
 * eyebrow/heading from the row. A type listed here with no renderer on the
 * client would be a section the admin can toggle to no effect — so the two
 * lists must be kept in step.
 *
 * This replaced an inherited kaybykhushie list (AnimatedBanner, GiftWrapping,
 * Reviews, KnowOurFounder, …) whose sections Jakalburg's storefront never had.
 * `seedDefaults` prunes any row whose type is no longer here.
 */

// Unsplash placeholders mirror the storefront's src/data/images.ts so the page
// renders out of the box; the admin swaps these for brand assets.
const img = (id: string, w = 1800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

// One hero slide — an image (or video) that fills the hero and links somewhere.
// Deliberately image-first: no title/subtitle/button (copy is baked into the
// marketing image); each slide just carries its media + a target link.
const DEFAULT_HERO_SLIDES = [
  {
    id: 'hero-1',
    image: img('1483985988355-763728e1935b'),
    video: '',
    mobileImage: '',
    mobileVideo: '',
    link: '/new-arrivals',
    categoryId: '',
  },
  {
    id: 'hero-2',
    image: img('1441984904996-e0b6ba687e04', 1600),
    video: '',
    mobileImage: '',
    mobileVideo: '',
    link: '/essentials',
    categoryId: '',
  },
  {
    id: 'hero-3',
    image: img('1490481651871-ab68de25d43d', 1600),
    video: '',
    mobileImage: '',
    mobileVideo: '',
    link: '/collections',
    categoryId: '',
  },
];

/**
 * The editorial band's defaults are the copy that was hardcoded in index.tsx
 * before this section became editable — so seeding changes nothing visible.
 */
const DEFAULT_ESSENTIALS_FEATURE = {
  image: img('1441984904996-e0b6ba687e04', 1600),
  body: 'Tees, tanks, polos, shirts and knits — cut from long-staple cottons and fine merino, in a small, considered palette.',
  buttonLabel: 'Shop essentials',
  buttonLink: '/essentials',
};

/**
 * The thin bar above the header. Its default copy is what was hardcoded in
 * `client/src/components/layout/AnnouncementBar.tsx` before this row existed,
 * so seeding changes nothing visible.
 */
const DEFAULT_ANNOUNCEMENT_BAR = {
  text: 'Complimentary shipping on orders over ₹2,499 · Easy 30-day returns',
  linkHref: '',
};

export const DEFAULT_HOME_SECTIONS: Prisma.HomeSectionCreateInput[] = [
  // Not a home-page block, and like Footer it renders site-wide from
  // SiteLayout. `order: 0` keeps it sorting above the hero without renumbering
  // the rows below — syncToCanonical only renumbers when a type is REMOVED, so
  // reusing order 1 here would tie with HeroSlider and sort arbitrarily.
  {
    type: 'AnnouncementBar',
    title: 'Announcement Bar',
    enabled: true,
    order: 0,
    data: DEFAULT_ANNOUNCEMENT_BAR,
  },
  {
    type: 'HeroSlider',
    title: 'Hero Slider',
    enabled: true,
    order: 1,
    // Split text+image hero by default; admin flips `fullBleed` on for the
    // edge-to-edge photo carousel (see the Hero Slider config modal).
    fullBleed: false,
    data: DEFAULT_HERO_SLIDES,
  },
  {
    type: 'JustArrived',
    eyebrow: 'New arrivals',
    title: 'Just arrived',
    enabled: true,
    order: 2,
    data: Prisma.JsonNull,
  },
  {
    type: 'ShopByMood',
    eyebrow: 'Collections',
    title: 'Shop by mood',
    enabled: true,
    order: 3,
    data: Prisma.JsonNull,
  },
  {
    type: 'EssentialsFeature',
    eyebrow: 'The Essentials',
    title: "Foundational pieces you'll reach for daily.",
    enabled: true,
    order: 4,
    data: DEFAULT_ESSENTIALS_FEATURE,
  },
  {
    type: 'EverydayEdit',
    eyebrow: 'Essentials',
    title: 'The everyday edit',
    enabled: true,
    order: 5,
    data: Prisma.JsonNull,
  },
  // Not a home-page block: the Footer row carries the site-wide footer
  // background images, which `client/src/components/layout/Footer.tsx` reads.
  // It lives here because the footer background is configured alongside the
  // home sections in the admin.
  { type: 'Footer', title: 'Footer', enabled: true, order: 6, data: {} },
];

/** The types above, for the prune step in `seedDefaults`. */
export const DEFAULT_HOME_SECTION_TYPES: string[] = DEFAULT_HOME_SECTIONS.map(
  (section) => section.type,
);

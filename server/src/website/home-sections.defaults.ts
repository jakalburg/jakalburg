import { Prisma } from '@prisma/client';

/**
 * Default home-page configuration seeded on first run (or restored via the
 * admin's "Restore Defaults" button). Seeding is idempotent — existing rows are
 * never overwritten, only missing `type`s are added (see WebsiteService.seed).
 *
 * Only HeroSlider is wired end-to-end to the storefront today; the other
 * sections are seeded so the admin's Home Setup tab isn't empty and each
 * section's config modal has a row to edit. Most ship disabled by default.
 */

// Unsplash placeholders mirror the storefront's src/data/images.ts so the hero
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

export const DEFAULT_HOME_SECTIONS: Prisma.HomeSectionCreateInput[] = [
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
    type: 'ShopByCategory',
    title: 'Shop By Collection',
    enabled: false,
    order: 2,
    data: [],
  },
  {
    type: 'AnimatedBanner',
    title: 'Animated Banner',
    enabled: false,
    order: 3,
    data: [],
  },
  { type: 'AGirlInKay', title: 'Trends', enabled: false, order: 4, data: [] },
  {
    type: 'GiftWrapping',
    title: 'Gift Wrapping',
    enabled: false,
    order: 5,
    data: {},
  },
  {
    type: 'CategoryStories',
    title: 'Category Stories',
    enabled: false,
    order: 6,
    data: [],
  },
  { type: 'Reviews', title: 'Reviews', enabled: false, order: 7, data: [] },
  {
    type: 'KnowOurFounder',
    title: 'Know Our Founder',
    enabled: false,
    order: 8,
    data: {},
  },
  { type: 'Footer', title: 'Footer', enabled: true, order: 9, data: {} },
];

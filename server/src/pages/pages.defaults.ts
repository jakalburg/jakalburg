import { Prisma } from '@prisma/client';

/**
 * The storefront's static pages, seeded from the copy that used to be
 * hardcoded in the client. Each `slug` IS the client route, so the storefront
 * fetches /pages/slug/<route-name>.
 *
 * Seeding is idempotent and never overwrites an edited page — see
 * PagesService.seedDefaults.
 */

export type FaqItem = { question: string; answer: string };
export type FaqSection = { heading: string; items: FaqItem[] };

export type DefaultPage = {
  title: string;
  slug: string;
  content: string;
  faqSections?: FaqSection[];
};

/** Slug of the FAQ page — the one page backed by `faqSections`, not `content`. */
export const FAQ_SLUG = 'faq';

export const DEFAULT_FAQ_SECTIONS: FaqSection[] = [
  {
    heading: 'Orders',
    items: [
      {
        question: 'How long will my order take?',
        answer:
          "Standard shipping arrives in 3–5 business days. Express arrives in 1–2. You'll receive a confirmation once your order ships.",
      },
      {
        question: 'Can I change or cancel my order?',
        answer:
          "You can edit or cancel any order within one hour of placing it, straight from your account. After that we've started packing.",
      },
    ],
  },
  {
    heading: 'Shipping & returns',
    items: [
      {
        question: 'Do you ship worldwide?',
        answer:
          'We ship across India, and to over 60 countries. International shipping rates are calculated at checkout.',
      },
      {
        question: 'What is your return policy?',
        answer:
          'Unworn pieces with tags can be returned within 30 days for a full refund. Final-sale pieces are marked at the product page.',
      },
    ],
  },
  {
    heading: 'Product & fit',
    items: [
      {
        question: 'How do your sizes run?',
        answer:
          'Most pieces run true to size, cut for a relaxed body. Detailed measurements live on every product page.',
      },
      {
        question: 'How should I care for my pieces?',
        answer:
          "Care instructions are printed on the label and listed on every product page. Cold washes and line drying will always extend a garment's life.",
      },
    ],
  },
  {
    heading: 'Account',
    items: [
      {
        question: 'Do I need an account to shop?',
        answer:
          'No — you can check out as a guest. An account lets you track orders, save addresses, and keep a wishlist.',
      },
    ],
  },
];

export const DEFAULT_PAGES: DefaultPage[] = [
  {
    // The footer's "Our story" link. Body copy only — the hero image stays on
    // the Website → About Page tab, which has the image uploader.
    title: 'A small studio, patient work.',
    slug: 'about',
    content: [
      '<p>Jakalburg is a considered ready-to-wear label. We work with a small palette of natural fibres — long-staple cottons, European linens, fine merino and Japanese denim — and cut them into a wardrobe that stays close for years.</p>',
      '<p>Every piece is designed in a small studio and produced in limited runs. We keep our range tight so that we can keep our care high, and price honestly so that the value stays with the garment, not the marketing.</p>',
      '<p>We believe the best clothes are ones you barely think about — the piece you reach for again and again because it works. That&rsquo;s the wardrobe we&rsquo;re building.</p>',
    ].join(''),
  },
  {
    title: 'Shipping',
    slug: 'shipping-policy',
    content: [
      '<p>We ship across India via trusted couriers.</p>',
      '<h2>Timelines</h2>',
      '<p>Standard shipping arrives in 3–5 business days. Express arrives in 1–2 business days. Both are tracked door-to-door.</p>',
      '<h2>Cost</h2>',
      '<p>Standard shipping is complimentary on orders over ₹2,499. Express is ₹199 flat. International shipping is calculated at checkout.</p>',
      '<h2>Packaging</h2>',
      '<p>We ship in recycled, recyclable mailers with cotton tape and a printed care note.</p>',
    ].join(''),
  },
  {
    title: 'Returns & exchanges',
    slug: 'returns-policy',
    content: [
      '<p>Unworn pieces with tags may be returned within 30 days for a full refund, or exchanged for a different size or colour where stock permits.</p>',
      '<h2>How</h2>',
      '<p>Start a return from your account (or by emailing care@jakalburg.example) and we&rsquo;ll email a prepaid pickup label.</p>',
      '<h2>Exceptions</h2>',
      '<p>Final-sale items are clearly marked on the product page and cannot be returned.</p>',
    ].join(''),
  },
  {
    title: 'Privacy',
    slug: 'privacy-policy',
    content: [
      '<p>This is a demo storefront. No personal data is transmitted to any server — everything you enter is kept in your browser&rsquo;s local storage only, and can be cleared by clearing site data.</p>',
      '<p>A production Jakalburg store would collect the minimum data needed to fulfil your order (name, address, contact, order history) and never share it with third parties beyond our shipping partners.</p>',
    ].join(''),
  },
  {
    title: 'Terms of use',
    slug: 'terms',
    content: [
      '<p>This is a demonstration site. No transactions are processed and no goods are shipped. Use the site to explore the design and interaction only.</p>',
      '<p>All imagery is used under royalty-free licence and is representative rather than of specific product samples.</p>',
    ].join(''),
  },
  {
    title: 'Frequently asked',
    slug: FAQ_SLUG,
    content: '',
    faqSections: DEFAULT_FAQ_SECTIONS,
  },
];

/** Shapes a default into a Prisma create payload. */
export const toCreateInput = (page: DefaultPage): Prisma.PageCreateInput => ({
  title: page.title,
  slug: page.slug,
  content: page.content,
  faqSections: (page.faqSections ?? Prisma.JsonNull) as Prisma.InputJsonValue,
  status: 'active',
});

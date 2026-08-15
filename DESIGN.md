# Website Design System

> Source website: https://one8.com  
> Analysed pages: Homepage, all-products collection, women’s footwear collection, men’s footwear collection, product detail, empty cart, About, Contact, FAQs, search interface, cart drawer, navigation menus, newsletter and footer  
> Last analysed: 2026-07-12

## Audit Scope and Confidence

This document records the public visual language and interaction patterns of the one8 storefront as observed on 12 July 2026.

**Confidence labels used throughout:**

- **Observed:** directly visible in the public interface or page structure.
- **Estimated:** a practical implementation value inferred from the rendered design. Confirm it with browser developer tools before pixel-perfect implementation.
- **Recommended extension:** not publicly observable, but designed to match the established one8 visual language.

The public storefront exposes product, collection, content, support and empty-cart experiences. The customer account redirects to Shopify-hosted authentication, while authenticated profile, order-history and checkout pages were not available for inspection. Sections covering those private pages are therefore explicitly marked as recommended extensions rather than claims about the current implementation.

---

## 1. Design Overview

### Overall visual style

one8 uses a **modern, performance-led, editorial e-commerce aesthetic**. The interface is primarily monochrome and lets product photography, athlete imagery and campaign media provide most of the colour.

The visual language combines:

- Large campaign-led media
- Strong black-and-white contrast
- Clean sans-serif typography
- Short, assertive headings
- Wide desktop layouts
- Minimal decorative borders
- High product-image prominence
- Simple, direct calls to action
- Magazine-like campaign composition
- Functional Shopify commerce patterns

### Brand personality

The design communicates:

- Performance
- Ambition
- Movement
- Discipline
- Confidence
- Global sportswear credibility
- Contemporary Indian identity
- Premium but accessible positioning

### Target audience

The storefront is designed for:

- Sportswear and athleisure customers
- Runners, gym users and cricket audiences
- Men and women shopping for footwear, apparel and caps
- Mobile-first younger shoppers
- Customers who respond strongly to campaigns and athlete-led storytelling

### Design mood

The mood is:

- Energetic rather than playful
- Premium rather than luxurious
- Minimal rather than decorative
- Editorial rather than marketplace-like
- Sport-focused rather than fashion-only
- Bold rather than soft

### General page composition

Most pages follow this hierarchy:

1. Global header and navigation
2. Search/cart/menu overlays when activated
3. Page-specific hero, title or breadcrumbs
4. Primary content area
5. Product or editorial modules
6. Newsletter signup
7. Multi-column footer
8. Consent or wishlist-related modal when required

### Main visual patterns

- Full-bleed campaign media
- Neutral product cards with large square imagery
- Black primary buttons
- Understated text links
- Compact product metadata
- Breadcrumbs on detail and support pages
- Large editorial headings with short supporting copy
- Repeated “shop by” and collection modules
- Grid-based content with limited card chrome
- Drawers for search, navigation and bag interactions

---

## 2. Design Principles

### 2.1 Product and campaign imagery lead the hierarchy

Images should occupy more visual area than supporting copy. Avoid compressing product imagery into small marketplace-style cards.

### 2.2 Monochrome UI, colourful content

The interface should remain largely black, white and neutral grey. Campaign photography and products may introduce colour naturally. Avoid adding unrelated UI colours.

### 2.3 Short, high-impact copy

Headings are concise and declarative. Supporting copy generally stays within one or two short lines.

### 2.4 Wide layouts with deliberate whitespace

Desktop layouts should feel open. Product grids may be dense, but surrounding sections should retain generous top and bottom spacing.

### 2.5 Minimal component decoration

Do not add heavy shadows, gradients, glassmorphism or overly rounded cards. Components rely on alignment, spacing, contrast and imagery.

### 2.6 Consistent commerce actions

“Add to Bag,” “Shop now,” “Explore” and equivalent calls to action should use a consistent hierarchy across the storefront.

### 2.7 Editorial and transactional modes coexist

Campaign pages can be immersive and image-led, while collection and product pages remain structured and practical. Both modes must use the same typography, buttons and spacing system.

### 2.8 Responsive simplification

On smaller screens:

- Collapse navigation into a drawer
- Reduce grid columns
- Convert side filters into a drawer
- Stack product media and details
- Use full-width purchase actions
- Preserve strong image prominence
- Avoid horizontal overflow

---

## 3. Colour System

The production CSS values could not be verified directly in this audit. The following palette is an implementation-ready approximation of the observed monochrome system.

| Token | Value | Confidence | Purpose | Usage |
|---|---:|---|---|---|
| `--color-black` | `#000000` | Observed/estimated | Primary brand neutral | Main buttons, headings, footer, icons |
| `--color-ink` | `#111111` | Estimated | Main readable text | Body and product text |
| `--color-charcoal` | `#242424` | Estimated | Secondary dark surface | Overlays, alternate dark sections |
| `--color-white` | `#FFFFFF` | Observed | Main light surface | Page and card backgrounds |
| `--color-off-white` | `#F7F7F5` | Estimated | Soft section surface | Product media, alternate sections |
| `--color-light-grey` | `#EFEFED` | Estimated | Subtle backgrounds | Skeletons, inactive areas |
| `--color-border` | `#D9D9D6` | Estimated | Structural separation | Inputs, accordions, dividers |
| `--color-border-dark` | `#A8A8A4` | Estimated | Stronger neutral border | Selected or active neutral control |
| `--color-text-muted` | `#6F6F6B` | Estimated | Supporting content | Product category, helper text |
| `--color-text-faint` | `#999995` | Estimated | Low emphasis | Placeholder and disabled text |
| `--color-overlay` | `rgba(0,0,0,0.52)` | Estimated | Modal/drawer overlay | Search, bag, mobile navigation |
| `--color-focus` | `#1A5DFF` | Recommended | Accessible focus ring | Keyboard focus only |
| `--color-success` | `#167A45` | Recommended extension | Positive status | Delivered, success messages |
| `--color-success-bg` | `#E9F5EE` | Recommended extension | Positive status background | Badges and alerts |
| `--color-warning` | `#8A5A00` | Recommended extension | Pending status | Pending or attention states |
| `--color-warning-bg` | `#FFF3D6` | Recommended extension | Pending background | Badges and alerts |
| `--color-error` | `#B42318` | Recommended extension | Error/destructive state | Validation, cancellation |
| `--color-error-bg` | `#FDECEC` | Recommended extension | Error background | Alerts and badges |
| `--color-info` | `#1D4E89` | Recommended extension | Informational state | Shipped or information alerts |
| `--color-info-bg` | `#EAF2FB` | Recommended extension | Information background | Alerts and badges |

### Colour usage rules

1. Use black for the strongest actions.
2. Use white for primary content surfaces.
3. Use off-white only to create section contrast.
4. Use grey borders instead of shadows for most UI separation.
5. Status colours should be reserved for semantic communication.
6. Do not colour every icon or label.
7. Campaign-specific colours may appear inside media, not as global UI tokens.

### Suggested CSS variables

```css
:root {
  --color-black: #000000;
  --color-ink: #111111;
  --color-charcoal: #242424;
  --color-white: #ffffff;
  --color-off-white: #f7f7f5;
  --color-light-grey: #efefed;
  --color-border: #d9d9d6;
  --color-border-dark: #a8a8a4;
  --color-text-muted: #6f6f6b;
  --color-text-faint: #999995;
  --color-overlay: rgba(0, 0, 0, 0.52);

  --color-focus: #1a5dff;
  --color-success: #167a45;
  --color-success-bg: #e9f5ee;
  --color-warning: #8a5a00;
  --color-warning-bg: #fff3d6;
  --color-error: #b42318;
  --color-error-bg: #fdecec;
  --color-info: #1d4e89;
  --color-info-bg: #eaf2fb;
}
```

---

## 4. Typography System

### Font-family identification

The storefront uses a clean modern sans-serif visual style. The exact production font family and font-loading source were not reliably exposed in the public text rendering used for this audit.

Before implementation, inspect the live page’s computed `font-family` and loaded font resources. Until then, use the following compatible stack:

```css
--font-sans: "Helvetica Neue", Helvetica, Arial, sans-serif;
```

Do not download or redistribute proprietary font files without the appropriate licence.

### Typographic character

- Neutral neo-grotesk appearance
- High legibility
- Moderate-to-tight heading tracking
- Compact product metadata
- Sentence case for most headings
- Selective uppercase for labels and utility text
- Strong weight contrast rather than decorative font pairing

### Typography table

All numeric values below are **estimated implementation values**.

| Element | Desktop Size | Mobile Size | Weight | Line Height | Letter Spacing | Transform |
|---|---:|---:|---:|---:|---:|---|
| Display hero | 56–72px | 36–48px | 500–600 | 0.95–1.05 | `-0.03em` | None |
| Page H1 | 44–56px | 32–40px | 500–600 | 1.05 | `-0.025em` | None |
| Section H2 | 32–42px | 26–32px | 500–600 | 1.1 | `-0.02em` | None |
| Card H3 | 20–26px | 18–22px | 500–600 | 1.2 | `-0.01em` | None |
| Product title | 30–40px | 26–32px | 500–600 | 1.12 | `-0.02em` | None |
| Product-card title | 15–17px | 14–16px | 500 | 1.3 | `0` | None |
| Body large | 18–20px | 17–18px | 400 | 1.5 | `0` | None |
| Body | 15–17px | 15–16px | 400 | 1.5 | `0` | None |
| Body small | 13–14px | 13–14px | 400 | 1.45 | `0` | None |
| Navigation | 14–16px | 16–18px | 500 | 1.2 | `0.01em` | None |
| Eyebrow/label | 11–13px | 11–12px | 500–600 | 1.3 | `0.08em` | Uppercase optional |
| Button | 14–16px | 14–16px | 500–600 | 1 | `0.01em` | Usually none |
| Price | 15–18px | 15–17px | 500–600 | 1.25 | `0` | None |
| Breadcrumb | 12–14px | 12–13px | 400 | 1.4 | `0` | None |
| Footer heading | 13–15px | 14–16px | 600 | 1.3 | `0` | None |
| Footer link | 13–15px | 14–16px | 400 | 1.45 | `0` | None |

### Typography rules

- Avoid excessive bolding.
- Keep paragraph measure near 55–75 characters.
- Use `text-wrap: balance` for major headings where supported.
- Use `overflow-wrap: break-word`, not `word-break: break-all`.
- Maintain tabular numerals for prices and order values where possible.
- Never reduce mobile body text below 14px.

---

## 5. Spacing System

The site uses a clean, generous spacing rhythm. A practical token system is:

```css
:root {
  --space-0: 0;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 32px;
  --space-8: 40px;
  --space-9: 48px;
  --space-10: 64px;
  --space-11: 80px;
  --space-12: 96px;
  --space-13: 128px;
}
```

### Estimated usage

| Context | Desktop | Tablet | Mobile |
|---|---:|---:|---:|
| Page horizontal gutter | 40–64px | 24–32px | 16–20px |
| Main section vertical padding | 80–128px | 64–88px | 48–64px |
| Compact section padding | 48–64px | 40–56px | 32–48px |
| Product-grid gap | 24–32px | 20–24px | 12–16px |
| Card content top gap | 12–16px | 12–16px | 10–12px |
| Form field gap | 16–20px | 16px | 14–16px |
| Button horizontal padding | 24–32px | 22–28px | 20–24px |
| Header inner gap | 24–40px | 20–28px | 16–20px |
| Footer column gap | 40–64px | 24–40px | 0 when accordion |
| Hero copy-to-action gap | 24–32px | 20–28px | 20–24px |

### Spacing rules

- Use the token scale consistently.
- Avoid arbitrary one-off margins.
- Keep related product metadata close together.
- Separate unrelated page modules with larger spacing.
- Mobile layouts should reduce spacing, not remove it.

---

## 6. Layout System

### Global containers

| Token | Estimated Value | Purpose |
|---|---:|---|
| `--container-max` | `1600px` | Main wide storefront content |
| `--container-reading` | `760px` | Policies, FAQs and long-form content |
| `--container-form` | `720px` | Contact and account forms |
| `--container-product` | `1520px` | Product gallery and information |
| `--container-narrow` | `560px` | Authentication and compact dialogs |

### Desktop

- Full-width media sections may touch viewport edges.
- Product and collection content should use a wide centred container.
- Product-detail page uses a two-column split:
  - Media: approximately 58–64%
  - Information: approximately 36–42%
- Collection pages use:
  - Optional filter sidebar: 240–300px
  - Flexible product grid: remaining width
- Footer uses four to five functional columns plus social/payment areas.

### Tablet

- Reduce outer gutters.
- Product grid becomes two or three columns depending on width.
- Product-detail split may remain two columns above approximately 900px.
- Filters should transition to a drawer or compact panel.

### Mobile

- Use a single content column.
- Product grids use two columns where imagery remains legible.
- Product-detail media appears before product information.
- Drawers occupy most or all viewport width.
- CTAs become full width.
- Footer columns become accordions.
- Avoid fixed-width elements.

### Full-width sections

Appropriate for:

- Hero campaign media
- Editorial banners
- Newsletter bands
- Dark footer
- High-impact collection storytelling

### Alignment

- Left-align most transactional content.
- Centred alignment is appropriate for newsletter, empty states and selected campaign headings.
- Product metadata should align consistently under imagery.
- Do not mix centre and left alignment inside the same card.

### Sticky elements

Observed or appropriate patterns:

- Sticky global header: estimated; confirm on the live site
- Sticky product-information column on desktop: recommended where gallery height is long
- Sticky mobile purchase bar: recommended extension
- Filter/sort controls may be sticky on long collection pages

---

## 7. Responsive Breakpoints

The exact CSS breakpoints were not available. Use these implementation breakpoints unless the current codebase already defines equivalents.

| Name | Width Range | Layout Behaviour |
|---|---:|---|
| Small mobile | `0–479px` | 1–2 column grids, full-width drawers and buttons |
| Mobile | `480–767px` | Two-column products, stacked PDP |
| Tablet | `768–1023px` | Two/three-column products, compact navigation |
| Small desktop | `1024–1279px` | Desktop navigation, 3-column products |
| Desktop | `1280–1599px` | 4-column products, wide containers |
| Large desktop | `1600px+` | Max-width content, generous gutters |

```css
@media (min-width: 480px) { /* large mobile */ }
@media (min-width: 768px) { /* tablet */ }
@media (min-width: 1024px) { /* desktop navigation */ }
@media (min-width: 1280px) { /* wide grid */ }
@media (min-width: 1600px) { /* max layout */ }
```

### Key responsive changes

- Desktop navigation becomes a menu trigger below tablet/desktop threshold.
- Mega menus become hierarchical mobile drawers.
- Product grid reduces from four columns to three, then two.
- Filter sidebar becomes a filter drawer.
- Product media and details stack.
- Footer columns become expandable groups.
- Hero text scales down substantially.
- Desktop hover-only actions must become permanently discoverable or tap-triggered.
- Large modal dialogs become bottom sheets or full-screen panels.

---

## 8. Header and Navigation

### Observed structure

The public navigation includes three top-level audience/merchandising entries:

- Featured
- Women
- Men

Utility actions include:

- Search
- Account
- Bag/cart with count

Additional links appear within menus:

- About
- Contact
- Return & Exchange Portal

### Desktop header

Recommended implementation based on the observed structure:

1. Optional utility/announcement row
2. Main header row:
   - Left: primary navigation
   - Centre: one8 logo
   - Right: search, account and bag icons
3. Mega menu below the header when a primary item is hovered or activated

### Header dimensions

| Property | Estimated Value |
|---|---:|
| Main header height | 72–88px |
| Utility bar height | 28–36px |
| Logo width | 72–110px |
| Utility icon size | 20–24px |
| Icon tap target | Minimum 44×44px |
| Header horizontal padding | 24–64px |

### Mega-menu behaviour

Observed content structure:

- Featured campaigns/collections
- Women:
  - Featured
  - Footwear
  - Clothing
  - Caps
  - Activity
- Men:
  - Featured
  - Footwear
  - Clothing
  - Caps
  - Activity
- Image-led category tiles inside expanded navigation

### Mega-menu styling

- White background
- Black text
- Wide viewport-aligned panel
- Multiple text columns
- Editorial image tiles
- Thin separator from header
- No heavy shadow; use a subtle shadow or border
- Active top-level item should remain visually highlighted

### Mobile navigation

Use a full-height left or full-screen drawer with:

- Back controls for nested levels
- Clear “Featured,” “Women” and “Men” entries
- Nested category groups
- Campaign images only when they do not obscure navigation
- Support/account links near the bottom
- Close button with 44px minimum target

### Search interface

Observed:

- Search field
- Trending searches
- Recently viewed products
- Ability to clear recently viewed content

Use a large overlay or drawer with:

- Autofocus input
- Clear button
- Search suggestions
- Product results
- Empty state
- Keyboard controls
- Esc-to-close on desktop

### Header states

- **Default:** white or transparent depending on hero treatment
- **Scrolled:** solid white with subtle bottom border
- **Dark hero overlay:** white logo and icons only if contrast remains sufficient
- **Menu open:** body scroll locked
- **Keyboard focus:** clear visible outline

---

## 9. Announcement Bar

A persistent announcement bar was not clearly confirmed in the public text rendering. If the live site currently uses one, preserve its actual content and timing.

### Recommended matching pattern

| Property | Value |
|---|---:|
| Height | 28–34px |
| Background | Black |
| Text | White |
| Font size | 11–13px |
| Weight | 500 |
| Alignment | Centred |
| Horizontal padding | 16px |
| Link style | White with underline on hover/focus |

### Behaviour

- Keep messages concise.
- Use a slow marquee only when multiple messages are necessary.
- Pause movement on hover.
- Respect `prefers-reduced-motion`.
- Do not allow the bar to consume excessive mobile height.

---

## 10. Buttons

### Primary button

- Black background
- White text
- Minimal or no radius
- Medium weight
- Height: 48–56px
- Horizontal padding: 24–32px
- Hover: dark charcoal or subtle inverse transition
- Focus: visible external ring
- Disabled: grey background and muted text

### Secondary button

- White background
- Black text
- 1px black border
- Same dimensions as primary
- Hover: black background, white text

### Text link button

Used for:

- Explore
- Shop now
- View collection
- Return home

Style:

- Text-only or underline treatment
- Compact horizontal footprint
- Strong focus state
- Optional arrow icon
- Avoid pill backgrounds

### Icon button

Used for:

- Search
- Account
- Bag
- Close
- Wishlist
- Gallery navigation

Requirements:

- Visual icon size: 20–24px
- Interactive area: at least 44×44px
- Transparent background
- Subtle hover surface
- Screen-reader label required

### Product-card “Add to Bag”

- Prefer a full-width or card-width action on hover for desktop
- Must remain discoverable on touch devices
- Height: 44–48px
- Use black/white contrast
- Disable when no size is selected if size selection occurs inside card

### Full-width mobile button

- Width: 100%
- Minimum height: 52px
- Sticky placement allowed on product pages
- Provide safe-area bottom padding

### Button CSS example

```css
.button {
  min-height: 52px;
  padding: 0 28px;
  border: 1px solid transparent;
  border-radius: 0;
  font: 600 15px/1 var(--font-sans);
  letter-spacing: 0.01em;
  transition:
    background-color 180ms ease,
    color 180ms ease,
    border-color 180ms ease,
    opacity 180ms ease;
}

.button--primary {
  background: var(--color-black);
  color: var(--color-white);
}

.button--secondary {
  background: var(--color-white);
  color: var(--color-black);
  border-color: var(--color-black);
}
```

---

## 11. Form Components

### Observed forms

The public Contact page includes:

- Reason selector
- Optional order number
- First name
- Last name
- Email
- Phone
- Message
- Newsletter checkbox
- Privacy/terms agreement
- Submit action

### Text inputs

| Property | Estimated Value |
|---|---:|
| Height | 52–56px |
| Border | 1px solid neutral grey |
| Radius | 0–2px |
| Padding | 14–16px |
| Font size | 15–16px |
| Background | White |
| Label gap | 8px |

### Textarea

- Minimum height: 140–180px
- Resize vertically
- Same border treatment as inputs
- Keep label visible outside the field

### Select

- Same height as text input
- Native or custom chevron
- Strong selected-value contrast
- Full keyboard support

### Checkbox/radio

- Visual size: 18–20px
- Click target: at least 44px high when combined with label
- Black selected state
- Clear focus ring

### Search input

- Larger than regular form input
- Prominent text size: 18–24px
- Search and clear icons
- Minimal container chrome
- Results appear directly below or in the same overlay

### Quantity selector

Recommended:

- Horizontal minus/value/plus control
- 44px minimum button targets
- Thin border
- No excessive radius
- Announce changes to screen readers

### Validation

- Place message below the relevant field
- Use error icon only when helpful
- Do not rely on red alone
- Preserve field value after server validation fails
- Provide a summary at the top for multi-field errors

### States

```css
.input:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
  border-color: var(--color-black);
}

.input[aria-invalid="true"] {
  border-color: var(--color-error);
}

.input:disabled {
  background: var(--color-light-grey);
  color: var(--color-text-faint);
  cursor: not-allowed;
}
```

---

## 12. Product Cards

### Observed content hierarchy

Product cards show:

- Optional badge such as “New” or category-specific label
- Product image
- Gender/activity or category metadata
- Product name
- Regular/sale price information
- Add to Bag action

### Card structure

1. Media container
2. Badge layer
3. Optional wishlist control
4. Metadata
5. Product title
6. Price row
7. Add-to-bag action

### Product image

- Recommended aspect ratio: 1:1
- Background: soft off-white
- `object-fit: contain` for footwear
- Apparel may use `cover` when model photography is used
- No rounded corners or only minimal radius
- Provide secondary image on hover where available
- Lazy-load below-the-fold images

### Card styling

- White page/card surface
- Little or no outer border
- No heavy shadow
- Content aligned left
- Image area visually dominant
- 12–16px gap between media and text
- 4–8px gaps within metadata

### Product-card typography

- Metadata: 12–13px, muted
- Name: 14–17px, medium weight
- Price: 14–17px, medium/semibold
- Compare-at price: muted and struck through
- Badge: 11–12px, medium, compact

### Hover behaviour

Desktop:

- Swap or gently zoom image
- Reveal/add emphasis to Add to Bag
- Show wishlist action
- Underline or slightly fade product title
- Keep transitions within 160–240ms

Touch:

- No hover dependency
- Actions remain visible
- First tap should navigate or activate a clearly labelled control, not trigger hidden hover state only

### Grid behaviour

| Layout | Columns | Gap |
|---|---:|---:|
| Large desktop | 4 | 24–32px |
| Standard desktop | 3–4 | 20–28px |
| Tablet | 2–3 | 16–24px |
| Mobile | 2 | 12–16px |
| Very narrow mobile | 1–2 | 12px |

### Long product names

```css
.product-card__title {
  overflow-wrap: break-word;
  word-break: normal;
  hyphens: auto;
}
```

Do not use `word-break: break-all`.

---

## 13. Product Listing and Collection Pages

### Observed structure

Collection pages include:

- Collection title
- Product count
- Category/sub-collection links
- Sort control
- Filter control
- Result count
- Product grid

Observed filter groups include:

- Price
- Gender
- Product type
- Size
- Category
- Colour
- Activity

### Desktop layout

Recommended:

- Page title and count at top
- Optional category links directly below
- Filter sidebar on left
- Sort control aligned right
- Product grid occupying remaining width
- Sticky filter summary when scrolling

### Mobile layout

- Title and count
- Horizontal or wrapped subcategory links
- Two-button utility row:
  - Filter
  - Sort
- Filter opens full-height drawer
- Sort opens bottom sheet or compact modal
- Product grid remains two columns

### Filter design

- Accordion groups
- Checkbox options with counts
- Clear all action
- Apply button on mobile
- Selected-filter chips above grid
- Result count updates after filtering
- Preserve URL query parameters

### Sort options observed

- Featured
- Most relevant
- Best selling
- Alphabetical A–Z/Z–A
- Price low-to-high/high-to-low
- Date old-to-new/new-to-old

### Collection heading

- Desktop: 40–56px
- Mobile: 30–38px
- Left aligned
- Product count visually subordinate

### Pagination/loading

The exact production method was not confirmed. Use one of:

- Pagination with accessible links
- “Load more” button
- Infinite scroll only with URL/history and accessibility safeguards

### Empty collection state

- Clear heading
- Short explanation
- Clear filters action
- Link to all products
- Optional recommendation grid

---

## 14. Product Details Page

### Observed structure

The public product page includes:

- Breadcrumbs
- Five product images with count indicator
- Badge such as “New”
- Gender/activity category
- Product name
- Short product summary
- Price
- Colour name
- Size guide
- Size selection
- Stock state
- Add to Bag
- Payment icons
- Selected-product summary
- Description
- Fabric/care information
- Technical specification content

### Desktop composition

Use a two-column layout:

#### Left: media gallery

- Two-column image grid or large primary with supporting images
- Product images on light neutral backgrounds
- Count indicator
- Optional zoom
- Sticky/contained gallery navigation where necessary

#### Right: product information

- Sticky within viewport where practical
- Breadcrumbs may remain above the overall grid
- Compact badge and category
- Large product title
- Short summary
- Price
- Colour and variation controls
- Size guide link
- Size selector
- Inventory state
- Add-to-bag action
- Payment methods
- Accordions

### Mobile composition

1. Breadcrumbs
2. Swipeable image carousel
3. Pagination/count
4. Badge and category
5. Product title and summary
6. Price
7. Colour
8. Size selector and size guide
9. Inventory state
10. Sticky Add to Bag
11. Product information accordions

### Gallery

- Image aspect ratio: approximately square
- Product centred with generous whitespace
- Swipe gestures on mobile
- Keyboard-operable thumbnails on desktop
- Zoom only when it adds useful detail
- Do not trap keyboard focus in zoom mode

### Variant selectors

- Use text buttons or swatches with labels
- Always show selected colour name
- Size buttons should be at least 44px high
- Disabled sizes must remain readable
- Do not represent availability by colour alone

### Size guide

- Open in modal or drawer
- Use a real semantic table
- Sticky header for long tables
- Include unit information
- Mobile table may scroll horizontally inside its own container only

### Purchase action

- Primary black full-width button
- Height 52–56px
- Loading state after click
- Prevent duplicate submissions
- Provide inline stock/selection errors
- Update cart count after success

### Product information accordions

Suggested order:

1. Description
2. Fabric & Care
3. Technical Specification
4. Delivery and Returns
5. Warranty

### Related products

Use the same product-card system and grid. Keep heading and spacing consistent with homepage “Featured.”

---

## 15. Cart and Checkout Design

### Cart drawer

The storefront exposes a “Your bag” drawer with an empty state.

#### Drawer structure

- Right-aligned desktop drawer
- Full-height
- Width: 420–520px estimated
- Full-screen on mobile
- Header with “Your bag,” count and close control
- Scrollable item region
- Sticky subtotal/action area

#### Empty state

Observed message indicates the bag is empty.

Recommended design:

- Large whitespace
- Brief message
- Primary “Continue shopping” action
- Optional product suggestions
- Do not overcrowd with promotional modules

### Cart page

Observed public empty-cart page includes:

- Empty-cart message
- Return-home action
- Recommendation area
- Newsletter
- Footer

For a populated cart, use:

- Product thumbnail
- Product name and selected variant
- Quantity selector
- Unit/line price
- Remove action
- Availability warning
- Order summary
- Checkout button

### Cart styling

- Rows separated by thin borders
- Minimal card chrome
- Thumbnail background off-white
- Totals aligned cleanly
- Primary checkout action black
- Supporting copy muted

### Coupon and shipping

- Use collapsible coupon input
- Show shipping calculation clearly
- Avoid presenting free-shipping claims that differ from checkout data
- Clearly disclose taxes and duties

### Checkout

Checkout was not publicly inspectable and may be Shopify-hosted.

Recommended consistency:

- Carry logo, black/white palette and sans-serif typography
- Keep form controls aligned with this system
- Use clear progress and order summary
- Do not customise payment-security behaviour beyond supported platform options
- Preserve Shopify’s validation and accessibility

---

## 16. Customer Profile and Order Pages

### Audit limitation

The account link redirects to Shopify-hosted authentication. Authenticated profile, address, order-history and order-detail screens were not publicly available. The following is a **recommended extension** designed to match the observed one8 storefront.

### Account dashboard

Desktop:

- Left navigation column: 220–260px
- Right content area
- Page title and customer greeting
- Cards for orders, addresses and profile details
- Thin borders and white surfaces
- No heavy dashboard-style shadows

Mobile:

- Top account heading
- Navigation converted to tabs, dropdown or stacked links
- Full-width content cards

### Profile navigation

Suggested links:

- Overview
- My Orders
- Addresses
- Profile Details
- Wishlist
- Logout

Use:

- 15–16px text
- Black active indicator
- Thin divider
- Clear focus styles

### Order list

Each order card should include:

- Order number
- Date
- Status badge
- Item count
- Total
- Product thumbnail previews
- View order action
- Invoice action when available

Design:

- 1px neutral border
- No or minimal radius
- 20–28px padding
- 20–24px gap between cards
- Entire card may be clickable, but inner buttons must remain separate controls

### Order-detail page

Recommended hierarchy:

1. Back to orders
2. Order number and date
3. Status/progress
4. Product items
5. Delivery address
6. Payment summary
7. Totals
8. Invoice and support actions

### Status badges

Use restrained semantic colours:

- Pending: warning palette
- Processing: information palette
- Shipped: information palette
- Delivered: success palette
- Cancelled: error palette
- Refunded: neutral/information palette

### Address cards

- Name, phone and formatted address
- Thin border
- Edit/remove text actions
- Clear default-address label
- Avoid excessive iconography

### Empty orders

- Centred or left-aligned empty state
- Heading: concise
- Supporting sentence
- Primary shop action
- Optional featured-product row

### Invoice button

Use a secondary outlined button. Preserve a clear loading/error state.

### Logout

Use a text or outlined action. Do not style it more prominently than purchasing actions unless confirmation is required.

---

## 17. Cards and Content Containers

### General card style

| Property | Value |
|---|---|
| Background | White or transparent |
| Border | None or 1px neutral |
| Radius | 0–4px |
| Shadow | None by default |
| Padding | 20–32px |
| Hover | Border/text/image transition |
| Mobile padding | 16–20px |

### Product cards

- Mostly borderless
- Image-led
- Content beneath image
- No large padded container around media

### Profile/order cards

- Thin border
- White background
- Clear grouping
- More internal padding than product cards

### Editorial cards

- Full-bleed image
- Text overlay or text beneath
- Large heading
- Short action link
- Avoid rounded “app card” appearance

### Promotional tiles

- Image-first
- Strong crop
- Minimal copy
- Use overlay gradients only when required for text contrast

---

## 18. Icons

### Visual style

- Simple outline icons
- Approximately 1.5–2px stroke
- Square visual bounds
- Minimal decoration
- Black/white depending on background

### Common icons

- Search
- Account/user
- Shopping bag
- Close
- Menu
- Chevron
- Arrow
- Wishlist/heart
- Filter
- Sort
- Plus/minus
- Social platforms
- Payment brands

### Recommended libraries

Use the project’s existing icon system. Where none exists, choose one consistent outline library such as:

- Lucide
- Heroicons Outline
- Phosphor Regular

Do not mix multiple icon families.

### Sizing

| Context | Size |
|---|---:|
| Header utility | 20–24px |
| Inline utility | 16–20px |
| Button icon | 16–20px |
| Drawer close | 22–24px |
| Social icon | 20–24px |
| Status icon | 16–18px |

### Accessibility

- Decorative icons: `aria-hidden="true"`
- Icon-only buttons: explicit `aria-label`
- Do not use icon shape alone for status meaning

---

## 19. Images and Media

### Product imagery

- Square composition
- Light neutral background
- Product centred
- High resolution
- Consistent product scale within a category
- `object-fit: contain` for footwear
- Provide meaningful alt text

### Hero media

Observed homepage campaigns include performance footwear, movement/lifestyle and cricket stories.

Use:

- Full-width images or video
- Strong athletic composition
- Short overlay text
- Clear contrast
- Poster image for video
- Muted autoplay only when used
- No autoplay audio

### Editorial imagery

- Large portrait or landscape campaign crops
- Asymmetric compositions are acceptable
- Preserve subject positioning across breakpoints using `object-position`
- Use separate mobile crops when necessary

### Banner dimensions

Estimated:

- Desktop hero: 16:9 to 21:9
- Mobile hero: 4:5 to 9:16
- Category card: 3:4 or 4:5
- Product card: 1:1
- Editorial strip: 16:7 to 16:9

### Loading

- Use responsive `srcset`
- Set explicit width/height or `aspect-ratio`
- Lazy-load below-the-fold media
- Preload only the main hero image
- Provide neutral skeletons

### Missing-image state

- Off-white container
- Small monochrome product placeholder
- Text alternative where appropriate
- Preserve expected aspect ratio

---

## 20. Borders, Radius and Shadows

### Borders

```css
--border-width-default: 1px;
--border-color-default: var(--color-border);
--border-color-strong: var(--color-black);
```

### Radius

The storefront appears square-edged and minimal.

```css
--radius-0: 0;
--radius-1: 2px;
--radius-2: 4px;
--radius-round: 999px;
```

Usage:

- Buttons: 0–2px
- Inputs: 0–2px
- Cards: 0–4px
- Badges: 2px or pill only for status
- Images: usually 0
- Icon hover circles: round

### Shadows

Use sparingly:

```css
--shadow-drawer: 0 0 32px rgba(0, 0, 0, 0.14);
--shadow-modal: 0 20px 60px rgba(0, 0, 0, 0.20);
--shadow-subtle: 0 1px 4px rgba(0, 0, 0, 0.08);
```

- Product cards: no shadow
- Header scrolled state: border or very subtle shadow
- Drawers/modals: soft elevation
- Dropdowns: subtle elevation only

### Focus ring

```css
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 3px;
}
```

---

## 21. Status Styles

These are **recommended extensions** for consistent transactional UI.

| Status | Background | Text | Border |
|---|---|---|---|
| Success/Delivered | `#E9F5EE` | `#167A45` | `#B9DFC8` |
| Warning/Pending | `#FFF3D6` | `#8A5A00` | `#EACB86` |
| Error/Cancelled | `#FDECEC` | `#B42318` | `#F4B8B3` |
| Information/Shipped | `#EAF2FB` | `#1D4E89` | `#B8D2EF` |
| Processing | `#F1EEFA` | `#59439B` | `#D2C8EE` |
| Refunded | `#EFEFED` | `#4E4E4A` | `#D9D9D6` |
| Out of stock | `#EFEFED` | `#5F5F5B` | `#D9D9D6` |
| Sale | `#000000` | `#FFFFFF` | `#000000` |
| New arrival | `#FFFFFF` | `#000000` | `#000000` |

### Badge dimensions

- Height: 24–28px
- Padding: 0 8–10px
- Font size: 11–12px
- Weight: 600
- Radius: 2px or pill where status semantics benefit
- Keep labels short

---

## 22. Animations and Interactions

### Motion character

Movement should feel quick and controlled, reflecting sports/performance positioning.

### Durations

```css
--duration-fast: 120ms;
--duration-default: 180ms;
--duration-slow: 280ms;
--duration-drawer: 320ms;
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-emphasized: cubic-bezier(0.2, 0.8, 0.2, 1);
```

### Recommended interactions

- Product image swap/zoom: 220–300ms
- Button colour change: 160–200ms
- Underline reveal: 160–220ms
- Drawer slide: 280–360ms
- Overlay fade: 180–240ms
- Accordion: 200–280ms
- Skeleton shimmer: optional and subtle

### Avoid

- Bouncy spring effects
- Large parallax that harms readability
- Long page-transition delays
- Auto-rotating carousels without controls
- Motion required to understand content

### Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 23. Modals, Drawers and Popups

### Search overlay

Observed content includes trending searches and recently viewed items.

Recommended:

- Desktop: large top overlay or right drawer
- Mobile: full-screen panel
- Prominent search input
- Suggested terms as simple links
- Recently viewed horizontal list/grid
- Close and clear controls

### Cart drawer

- Right side on desktop
- Full screen on mobile
- Sticky header and footer
- Body scroll locked
- Focus trapped while open
- Esc closes on desktop

### Mobile menu

- Full height
- Hierarchical navigation
- Back button
- Campaign image tiles where space permits
- Support/account links at bottom

### Consent modal

The storefront includes a wishlist consent experience.

Design requirements:

- Clear purpose heading
- Short explanation
- Primary and secondary decisions
- No deceptive button hierarchy
- Persist choice appropriately
- Keyboard and screen-reader accessible

### Generic modal dimensions

| Type | Desktop Width | Mobile |
|---|---:|---|
| Small confirmation | 420–520px | Width minus 32px |
| Form modal | 560–720px | Full-screen or near full-screen |
| Size guide | 720–960px | Full-screen/bottom sheet |
| Search | 760px+ or full width | Full-screen |

### Overlay

- `rgba(0,0,0,0.52)` estimated
- Fade in/out
- Clicking outside may close non-destructive dialogs
- Destructive confirmations require an explicit action

---

## 24. Footer

### Observed content groups

The footer includes:

- Shop
- one8
- Customer Support
- Account
- Legal
- Social links
- Copyright
- Payment methods

The newsletter appears directly before the main footer.

### Newsletter band

Observed hierarchy:

- “Join the one8 movement” heading
- Short supporting text
- Email input
- Join action

Design:

- Strong section separation
- Large heading
- Wide input/action row on desktop
- Stacked input and button on mobile
- Black/white or off-white treatment
- Inline success/error message

### Desktop footer

- Dark or strongly contrasted surface
- 4–5 columns
- Clear group headings
- Compact vertical link rhythm
- Social section separated by spacing or border
- Payment icons and copyright at bottom

### Mobile footer

- Accordion groups
- One open at a time optional
- Minimum 48px accordion headers
- Social icons in a horizontal row
- Payment methods wrapped below
- Copyright at the end

### Footer typography

- Group headings: 13–15px semibold
- Links: 13–15px regular
- Legal/copyright: 11–13px
- High contrast on dark surface
- Underline links on keyboard focus

---

## 25. Page-Specific Design Details

### 25.1 Homepage

Observed module sequence:

1. Campaign hero/story area
2. Service benefits:
   - Free shipping
   - Returns and exchanges
   - Warranty
3. Featured products
4. “Elevate Your Everyday” category section
5. Menswear editorial section
6. Womenswear editorial section
7. Cricket collection promotion
8. Newsletter
9. Footer

Design rules:

- Alternate immersive media and structured product modules.
- Keep hero copy brief.
- Use category cards as visual navigation.
- Maintain large spacing between campaign sections.
- Product rows should remain visually lighter than campaign media.
- On mobile, stack editorial media before copy or use text overlays only with strong contrast.

### 25.2 Collection/category page

Observed:

- Title and product count
- Subcategory links
- Sort and filter controls
- Multiple filter groups
- Product results grid

Design rules:

- Keep utility controls compact.
- Do not let filters visually compete with products.
- Use selected-filter chips.
- Preserve product card consistency.
- On mobile, filter and sort controls should remain easy to reach.

### 25.3 Product detail page

Observed:

- Five-image gallery
- Product metadata and summary
- Price and colour
- Size guide and sizes
- Stock state and Add to Bag
- Payment logos
- Product-information sections

Design rules:

- Product media receives majority of desktop width.
- Purchase controls remain visible without excessive scrolling.
- Use a sticky details column where safe.
- Mobile uses a swipeable media carousel and sticky purchase action.

### 25.4 Search

Observed search overlay content:

- Search field
- Trending searches
- Recently viewed
- Clear recent items

Design rules:

- Search opens quickly and receives focus.
- Suggestions should be grouped clearly.
- Product results use compact cards.
- “No results” should offer alternate terms and category links.

### 25.5 Cart

Observed empty drawer and empty cart page.

Design rules:

- Keep empty state simple.
- Use a clear return-to-shopping action.
- Recommendations should be secondary.
- Populated cart uses clean rows, not oversized cards.

### 25.6 Contact

Observed:

- Breadcrumbs
- Contact form
- Support information
- Newsletter and footer

Design rules:

- Use a readable form width.
- Keep mandatory labels explicit.
- Place support information alongside or below the form.
- On desktop, a two-column form/support layout is suitable.
- On mobile, stack the form before support details.

### 25.7 About

Observed:

- Large brand imagery
- Strong mission statements
- Product recommendation section
- Newsletter and footer

Design rules:

- Editorial imagery should dominate.
- Use high-impact statement text.
- Avoid long uninterrupted paragraphs.
- Break content into image/text chapters.

### 25.8 FAQs

Observed:

- Major uppercase topic headings
- Multiple question-and-answer groups
- Topics include ordering, payments, shipping and returns

Design rules:

- Use accordion items for scannability.
- Provide a search field for large FAQ sets.
- Constrain text width.
- Keep questions semibold and answers regular.
- Support deep links to individual topics.

### 25.9 Login/signup

Public account redirects to Shopify-hosted authentication.

Recommended styling:

- Centred narrow panel
- one8 logo
- Minimal heading and guidance
- 52–56px form fields
- Black primary action
- Clear OTP/email state
- No decorative dashboard background
- Preserve Shopify security and accessibility behaviours

### 25.10 Profile/orders

Not publicly inspectable. Follow the recommended patterns in Section 16.

### 25.11 Checkout

Not publicly inspectable. Preserve Shopify checkout structure and apply only supported brand styling.

---

## 26. Accessibility Guidelines

### Colour contrast

- Body text: minimum 4.5:1
- Large text: minimum 3:1
- Interactive controls and focus indicators: minimum 3:1 against adjacent colours
- Never place white copy on bright campaign media without a dark overlay or text backing

### Keyboard navigation

All of the following must be keyboard operable:

- Header menus
- Mega menus
- Search overlay
- Filter accordions
- Product gallery
- Size selectors
- Quantity controls
- Cart drawer
- Modals
- FAQ accordions

### Focus visibility

- Use a visible external focus ring
- Do not remove outlines without replacement
- Keep focus within open modal/drawer
- Return focus to the trigger after closing

### Tap targets

- Minimum 44×44px
- Mobile purchase actions 52px high or larger
- Keep adequate spacing between icon buttons

### Forms

- Visible labels
- Programmatic label association
- Required fields announced
- Error text tied with `aria-describedby`
- Do not use placeholders as labels

### Images

- Product images: meaningful product/angle alt text
- Decorative campaign media: empty alt
- Avoid repeating identical alt text for every gallery image

### Semantic structure

- One `h1` per page
- Logical heading order
- Real buttons for actions
- Real links for navigation
- Semantic tables for size guides
- Landmarks for header, navigation, main and footer

### Reduced motion

Respect system preference and provide manual control for video/carousels.

### Live regions

Use polite announcements for:

- Item added to bag
- Quantity updated
- Validation results
- Filter result counts
- Wishlist changes

---

## 27. Empty, Loading and Error States

### Loading page

- Neutral skeleton blocks
- Preserve final layout dimensions
- Avoid full-page spinners where skeletons are possible

### Product-card skeleton

- Square media block
- Two short text lines
- Price line
- Subtle static grey or low-motion shimmer

### Empty cart

- Brief heading/message
- Primary shopping action
- Optional recommendations

### Empty orders

- Order-history-specific message
- Shop action
- No generic “Nothing here” wording

### No search results

- Show query
- Suggest spelling or trending terms
- Link to major categories
- Clear search action

### API/server error

- Plain-language explanation
- Retry action
- Support link where appropriate
- Never expose stack traces

### Missing image

- Preserve media ratio
- Neutral placeholder
- Product name remains visible

### Product unavailable

- Keep product information accessible
- Disable purchase action
- Offer related alternatives or notification signup
- Clearly distinguish “sold out” from technical errors

### Unauthorized account page

- Explain that login is required
- Provide login action
- Preserve intended return URL

### 404 page

Recommended:

- Large concise heading
- One sentence
- Search field
- Links to Featured, Women and Men
- Optional campaign image
- Primary return-home action

---

## 28. Reusable Component Inventory

| Component | Purpose | Variants | Responsive behaviour |
|---|---|---|---|
| `AnnouncementBar` | Storewide notice | Static, marquee | Single-line mobile |
| `MainHeader` | Global identity/actions | Light, overlay, scrolled | Compact mobile |
| `DesktopNavigation` | Top-level menus | Default, active | Hidden below desktop |
| `MegaMenu` | Category discovery | Featured, Women, Men | Becomes nested drawer |
| `MobileNavigation` | Mobile category navigation | Root, nested | Full-screen |
| `SearchOverlay` | Product search | Initial, results, empty | Full-screen mobile |
| `CartDrawer` | Quick cart | Empty, populated | Full-screen mobile |
| `Breadcrumbs` | Page hierarchy | Standard, compact | Horizontal scroll only if necessary |
| `SectionHeading` | Module title/action | Left, centred | Reduced type size |
| `PrimaryButton` | Main action | Default, loading, disabled | Often full width |
| `SecondaryButton` | Alternate action | Outline, inverse | Often full width |
| `TextLink` | Editorial navigation | Arrow, underline | Same |
| `IconButton` | Utility actions | Header, inline, overlay | 44px target |
| `ProductCard` | Product discovery | Default, sale, sold out | 2-column mobile |
| `ProductGrid` | Product layout | 2/3/4 column | Responsive columns |
| `ProductBadge` | Product label | New, sale, cricket | Compact |
| `FilterSidebar` | Desktop filtering | Expanded/collapsed groups | Hidden mobile |
| `FilterDrawer` | Mobile filtering | Initial, applied | Full-height |
| `SortMenu` | Product sorting | Select, bottom sheet | Bottom sheet mobile |
| `SelectedFilterChip` | Applied filter | Removable | Wraps |
| `PriceRange` | Price filter | Preset or slider | Full width |
| `ProductGallery` | PDP media | Grid, carousel | Carousel mobile |
| `ThumbnailRail` | Gallery navigation | Vertical/horizontal | Hidden or horizontal |
| `VariantSelector` | Colour/size choice | Swatch, text button | Wraps |
| `SizeGuideModal` | Sizing help | Shoes, apparel | Full-screen mobile |
| `QuantitySelector` | Cart quantity | Compact, large | Same |
| `Accordion` | Details/FAQs/footer | Single/multiple open | Footer mobile |
| `StatusBadge` | Order/stock state | Semantic statuses | Same |
| `OrderCard` | Order summary | Standard, cancelled | Stacked mobile |
| `AddressCard` | Saved address | Default/editable | Full-width |
| `FormField` | Text data | Input, select, textarea | Full-width |
| `CheckboxField` | Consent/filter | Standard, compact | Larger touch target |
| `Alert` | Feedback | Success/error/info | Full-width |
| `Modal` | Focused task | Small, medium, large | Full-screen mobile |
| `Drawer` | Navigation/cart/filter | Left/right | Full-screen mobile |
| `NewsletterForm` | Email signup | Inline, stacked | Stacked mobile |
| `SocialLinks` | Social navigation | Light/dark | Wraps |
| `PaymentIcons` | Accepted methods | Monochrome/brand | Wraps |
| `SiteFooter` | Global supporting navigation | Desktop columns, mobile accordion | Accordion mobile |

---

## 29. Design Tokens

```css
:root {
  /* Typography */
  --font-sans: "Helvetica Neue", Helvetica, Arial, sans-serif;

  --font-size-2xs: 11px;
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 22px;
  --font-size-2xl: 28px;
  --font-size-3xl: 36px;
  --font-size-4xl: 48px;
  --font-size-5xl: 64px;
  --font-size-6xl: 72px;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --line-height-tight: 1.05;
  --line-height-heading: 1.15;
  --line-height-body: 1.5;

  /* Colours */
  --color-black: #000000;
  --color-ink: #111111;
  --color-charcoal: #242424;
  --color-white: #ffffff;
  --color-off-white: #f7f7f5;
  --color-light-grey: #efefed;
  --color-border: #d9d9d6;
  --color-border-dark: #a8a8a4;
  --color-text-muted: #6f6f6b;
  --color-text-faint: #999995;
  --color-overlay: rgba(0, 0, 0, 0.52);
  --color-focus: #1a5dff;

  --color-success: #167a45;
  --color-success-bg: #e9f5ee;
  --color-warning: #8a5a00;
  --color-warning-bg: #fff3d6;
  --color-error: #b42318;
  --color-error-bg: #fdecec;
  --color-info: #1d4e89;
  --color-info-bg: #eaf2fb;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 32px;
  --space-8: 40px;
  --space-9: 48px;
  --space-10: 64px;
  --space-11: 80px;
  --space-12: 96px;
  --space-13: 128px;

  /* Layout */
  --container-max: 1600px;
  --container-product: 1520px;
  --container-reading: 760px;
  --container-form: 720px;
  --container-narrow: 560px;

  --page-gutter-mobile: 16px;
  --page-gutter-tablet: 28px;
  --page-gutter-desktop: 48px;
  --page-gutter-wide: 64px;

  /* Borders */
  --border-width: 1px;
  --radius-0: 0;
  --radius-1: 2px;
  --radius-2: 4px;
  --radius-round: 999px;

  /* Shadows */
  --shadow-subtle: 0 1px 4px rgba(0, 0, 0, 0.08);
  --shadow-drawer: 0 0 32px rgba(0, 0, 0, 0.14);
  --shadow-modal: 0 20px 60px rgba(0, 0, 0, 0.20);

  /* Z-index */
  --z-base: 0;
  --z-sticky: 20;
  --z-header: 40;
  --z-dropdown: 60;
  --z-overlay: 80;
  --z-drawer: 90;
  --z-modal: 100;
  --z-toast: 120;

  /* Motion */
  --duration-fast: 120ms;
  --duration-default: 180ms;
  --duration-slow: 280ms;
  --duration-drawer: 320ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-emphasized: cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

### Container utility

```css
.container {
  width: min(
    calc(100% - (2 * var(--page-gutter-mobile))),
    var(--container-max)
  );
  margin-inline: auto;
}

@media (min-width: 768px) {
  .container {
    width: min(
      calc(100% - (2 * var(--page-gutter-tablet))),
      var(--container-max)
    );
  }
}

@media (min-width: 1280px) {
  .container {
    width: min(
      calc(100% - (2 * var(--page-gutter-desktop))),
      var(--container-max)
    );
  }
}
```

---

## 30. Recommended Implementation Rules

1. Reuse shared components for buttons, cards, form controls, badges and drawers.
2. Keep global UI monochrome.
3. Let campaign imagery provide colour.
4. Avoid inline styles.
5. Use CSS variables for all repeated values.
6. Preserve the project’s existing font files and licensing.
7. Do not introduce large border radii.
8. Do not add strong shadows to product cards.
9. Use wide, high-resolution imagery.
10. Keep product-card image ratios consistent.
11. Use a maximum content width on large screens.
12. Preserve full-width campaign sections.
13. Use semantic HTML.
14. Ensure all drawers and modals support keyboard operation.
15. Use URL-based filtering and sorting.
16. Keep mobile grids to two columns only when text remains readable.
17. Use full-width mobile purchase actions.
18. Avoid horizontal page scrolling.
19. Allow horizontal scrolling only inside deliberately scrollable components such as a size table.
20. Wrap long text by words.
21. Never use `word-break: break-all`.
22. Show loading, empty and error states for every async module.
23. Prevent duplicate Add to Bag and form submissions.
24. Keep the existing header and footer on all public pages.
25. New account and order pages must look like the storefront, not a generic admin dashboard.
26. Do not copy one8 logos, photography or proprietary campaign assets into another brand without permission.
27. Adapt the layout language to the destination brand rather than creating an exact clone.
28. Verify all estimated dimensions against the live site with developer tools before final pixel-polish.

---

## 31. Design Inconsistencies Found

This section separates observable risks from recommended corrections.

### 31.1 Repeated navigation content in document structure

The public page output contains desktop, mega-menu and mobile-menu content variants simultaneously. This may be normal for responsive rendering, but hidden duplicates must be properly excluded from assistive technology.

**Recommendation:** Ensure inactive navigation variants use appropriate hidden/inert behaviour and do not create duplicate tab stops.

### 31.2 Price accessibility text appears duplicated

Product-card text output includes repeated “Regular price” and “Sale price” labels even where values are identical.

**Recommendation:** Review screen-reader-only pricing labels so only meaningful price information is announced.

### 31.3 Cart and menu content appears globally embedded

The bag and navigation drawers are present in the document structure on many pages.

**Recommendation:** Ensure closed drawers are inert, hidden from screen readers and removed from keyboard order.

### 31.4 Size-guide duplication on product pages

Size-guide information appears more than once in the product-page document output.

**Recommendation:** Keep one accessible source of the size table and avoid duplicate announcements.

### 31.5 Heavy content volume in navigation

Mega menus contain many links and campaign images.

**Recommendation:** Maintain strong heading/group semantics and concise mobile nesting.

### 31.6 Potential hover dependence

Product-card Add to Bag or image changes may rely on desktop hover.

**Recommendation:** Keep essential actions visible on touch and keyboard devices.

### 31.7 Account visual continuity

The account route uses Shopify-hosted authentication, which may differ from the storefront.

**Recommendation:** Apply supported brand settings and ensure the transition is clearly branded.

### 31.8 Accessibility verification still required

Exact contrast, focus treatment and hidden-content behaviour cannot be confirmed from text rendering alone.

**Recommendation:** Run keyboard testing, screen-reader testing, automated accessibility checks and colour-contrast verification.

### 31.9 Exact CSS values unavailable

Font family, exact colours, breakpoints and spacing values were not directly recoverable during this audit.

**Recommendation:** Treat numeric tokens marked estimated as a strong starting point and confirm them against computed styles.

---

## 32. Final Design Checklist

### Brand and typography

- [ ] The page uses the site’s actual licensed sans-serif font.
- [ ] Headings are strong, concise and not excessively bold.
- [ ] Product metadata is visually subordinate.
- [ ] Text sizes remain readable on mobile.
- [ ] Long words and names wrap naturally.

### Colour and surfaces

- [ ] UI colours remain primarily black, white and neutral grey.
- [ ] Campaign media provides most decorative colour.
- [ ] Status colours are used only semantically.
- [ ] Text and controls meet contrast requirements.
- [ ] No unrelated gradients or glass effects were introduced.

### Layout

- [ ] The correct max-width container is used.
- [ ] Full-width campaign sections remain full width.
- [ ] Desktop gutters are generous.
- [ ] Mobile gutters are at least 16px.
- [ ] No horizontal page overflow exists.
- [ ] Product grids reduce columns at the correct breakpoints.

### Header and footer

- [ ] Featured, Women and Men navigation remains clear.
- [ ] Search, account and bag controls are accessible.
- [ ] Mega menu groups are properly labelled.
- [ ] Mobile navigation supports nested back controls.
- [ ] Newsletter and footer match the storefront.
- [ ] Footer groups collapse appropriately on mobile.

### Product cards

- [ ] Product imagery uses a consistent square ratio.
- [ ] Product scale is consistent within a grid.
- [ ] Category, name and price hierarchy is correct.
- [ ] Add to Bag is discoverable on touch devices.
- [ ] Sale and sold-out states are clear.
- [ ] Missing images preserve layout.

### Product detail

- [ ] Product gallery is keyboard and swipe accessible.
- [ ] Variant selections have text labels.
- [ ] Size guide uses a semantic table.
- [ ] Add to Bag has loading and error states.
- [ ] Mobile purchase action is easy to reach.
- [ ] Accordions follow a consistent pattern.

### Forms

- [ ] Every field has a visible label.
- [ ] Required states are announced.
- [ ] Validation appears beside the relevant field.
- [ ] Focus styling is visible.
- [ ] Buttons prevent duplicate submissions.
- [ ] Consent choices are not deceptive.

### Drawers and modals

- [ ] Focus is trapped while open.
- [ ] Background content is inert.
- [ ] Esc closes appropriate desktop dialogs.
- [ ] Focus returns to the trigger after closing.
- [ ] Mobile drawers use the full available width.
- [ ] Close controls have 44px targets.

### Account and order extensions

- [ ] Account pages use the storefront design language.
- [ ] Order cards use thin borders and minimal chrome.
- [ ] Status badges are semantic and restrained.
- [ ] Order details work on mobile.
- [ ] Invoice and support actions are clear.
- [ ] Empty-order state includes a shopping action.

### Accessibility and quality

- [ ] Heading order is logical.
- [ ] All controls work with keyboard only.
- [ ] Images have appropriate alt text.
- [ ] Reduced-motion preferences are respected.
- [ ] Screen readers do not encounter duplicate hidden navigation.
- [ ] Loading, empty, error and unavailable states are implemented.
- [ ] The design has been checked at 320px, 375px, 768px, 1024px, 1440px and 1920px.
- [ ] Estimated values have been verified with live computed styles before final release.

---

## Audit Sources

Public pages inspected during this audit:

- `https://one8.com/`
- `https://one8.com/collections/all`
- `https://one8.com/collections/women-footwear`
- `https://one8.com/collections/men-footwear`
- `https://one8.com/products/boom-rush-men-black-beauty-silver-metallic`
- `https://one8.com/cart`
- `https://one8.com/pages/about-us`
- `https://one8.com/pages/contact`
- `https://one8.com/pages/faqs`
- `https://one8.com/account`

Authenticated account, populated cart, checkout and order-detail screens were not available for public inspection.

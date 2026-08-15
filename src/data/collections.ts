import { collectionImages } from "./images";

export interface Collection {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  image: string;
}

export const collections: Collection[] = [
  {
    slug: "summer-essentials",
    title: "Summer Essentials",
    tagline: "Linen, cotton, ease.",
    description:
      "A capsule of breathable pieces built for warm months — washed linen, weightless cotton, and easy silhouettes.",
    image: collectionImages.summerEssentials,
  },
  {
    slug: "monochrome",
    title: "Monochrome",
    tagline: "One tone, many shapes.",
    description:
      "Ivory, ink, and charcoal — a study in restraint. Every piece designed to layer with the next.",
    image: collectionImages.monochrome,
  },
  {
    slug: "workwear",
    title: "Workwear",
    tagline: "Made to be worn hard.",
    description:
      "Denim, oxford cotton, and rugged twills — pieces that soften with wear and get better every wash.",
    image: collectionImages.workwear,
  },
  {
    slug: "weekend",
    title: "Weekend",
    tagline: "Off-hours uniform.",
    description:
      "Bombers, overshirts, and easy trousers — pieces to slip into when nothing is required.",
    image: collectionImages.weekend,
  },
  {
    slug: "atelier",
    title: "Atelier",
    tagline: "Tailored, considered.",
    description:
      "Softly tailored pieces cut from Italian wools and cottons — the wardrobe you keep for years.",
    image: collectionImages.atelier,
  },
  {
    slug: "essentials",
    title: "The Essentials",
    tagline: "The pieces you'll reach for daily.",
    description:
      "Tees, tanks, polos, shirts, and knits — the foundational layers that make the rest work.",
    image: collectionImages.summerEssentials,
  },
];

export const findCollection = (slug: string) => collections.find((c) => c.slug === slug);

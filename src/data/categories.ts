import type { Gender, ProductCategory } from "@/types";
import { categoryImages } from "./images";

export interface Category {
  slug: string;
  title: string;
  gender: Gender | "all";
  category: ProductCategory;
  image: string;
}

export const womenCategories: Category[] = [
  { slug: "women-dresses", title: "Dresses", gender: "women", category: "dresses", image: categoryImages.dresses },
  { slug: "women-shirts", title: "Shirts", gender: "women", category: "shirts", image: categoryImages.shirts },
  { slug: "women-trousers", title: "Trousers", gender: "women", category: "trousers", image: categoryImages.trousers },
  { slug: "women-knitwear", title: "Knitwear", gender: "women", category: "knitwear", image: categoryImages.knitwear },
  { slug: "women-tshirts", title: "T-shirts", gender: "women", category: "t-shirts", image: categoryImages.tShirts },
  { slug: "women-jackets", title: "Jackets", gender: "women", category: "jackets", image: categoryImages.jackets },
];

export const menCategories: Category[] = [
  { slug: "men-shirts", title: "Shirts", gender: "men", category: "shirts", image: categoryImages.shirts },
  { slug: "men-polos", title: "Polos", gender: "men", category: "polos", image: categoryImages.polos },
  { slug: "men-trousers", title: "Trousers", gender: "men", category: "trousers", image: categoryImages.trousers },
  { slug: "men-jeans", title: "Jeans", gender: "men", category: "jeans", image: categoryImages.jeans },
  { slug: "men-knitwear", title: "Knitwear", gender: "men", category: "knitwear", image: categoryImages.knitwear },
  { slug: "men-jackets", title: "Jackets", gender: "men", category: "jackets", image: categoryImages.jackets },
];

export const allCategories = [...womenCategories, ...menCategories];

export const findCategory = (slug: string) => allCategories.find((c) => c.slug === slug);

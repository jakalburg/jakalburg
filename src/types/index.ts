export type Gender = "women" | "men" | "unisex";

export type ProductCategory =
  | "tops"
  | "t-shirts"
  | "shirts"
  | "dresses"
  | "co-ord-sets"
  | "trousers"
  | "jeans"
  | "skirts"
  | "jackets"
  | "knitwear"
  | "polos"
  | "overshirts"
  | "shorts";

export interface ProductColor {
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  gender: Gender;
  category: ProductCategory;
  price: number;
  compareAtPrice?: number;
  images: string[];
  colors: ProductColor[];
  sizes: string[];
  soldOutSizes?: string[];
  tags: string[];
  isNew?: boolean;
  onSale?: boolean;
  collection?: string;
  essential?: boolean;
  description: string;
  fabric: string;
  care: string;
}

export interface CartItem {
  productId: string;
  slug: string;
  title: string;
  image: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
}

export interface Address {
  id: string;
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault?: boolean;
}

export interface MockOrder {
  id: string;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  status: "processing" | "shipped" | "delivered";
  address: Address;
  email: string;
  paymentLabel: string;
}

export interface MockUser {
  email: string;
  name: string;
}

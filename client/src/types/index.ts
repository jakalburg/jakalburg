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
  /** @deprecated single slug — use `collections`. */
  collection?: string;
  /** Collection slugs this product belongs to (many-to-many). */
  collections?: string[];
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

// A user profile as embedded in the backend user response (subset we use).
export interface AuthProfile {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  contactNo?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  country?: string | null;
  zipCode?: string | null;
}

// Raw user shape returned by the backend (UserResponseDto). `email` may be null
// and there is no name column — the display name lives on the first profile.
export interface BackendUser {
  id: string;
  email: string | null;
  image: string | null;
  role: string;
  emailVerified: string | null;
  createdAt: string;
  updatedAt: string;
  hasPassword: boolean;
  providers: string[];
  profiles?: AuthProfile[];
  accounts?: unknown[];
}

// Authenticated user normalized for the client store. `name` is derived (see
// normalizeUser) so existing consumers that read `user.name` keep working.
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  role?: string;
  emailVerified?: string | null;
  hasPassword?: boolean;
  providers?: string[];
  profiles?: AuthProfile[];
}

// { user, accessToken } returned by login / verify-email / google callback.
export interface AuthResponse {
  user: BackendUser;
  accessToken: string;
}

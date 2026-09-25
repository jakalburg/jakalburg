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
  // Per-colour variant overrides. An empty array / undefined means "inherit the
  // product-level value" — the PDP resolves the effective value at render time.
  images?: string[];
  sizes?: string[];
  soldOutSizes?: string[];
  price?: number;
  compareAtPrice?: number;
  stock?: number;
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
  /** Mean of approved review ratings (1 dp). 0 when nobody has reviewed yet. */
  avgRating?: number;
  /** Number of approved reviews. */
  reviewCount?: number;
  /** When true, an admin has hidden this product's reviews + rating. */
  reviewsHidden?: boolean;
}

export type ReviewStatus = "pending" | "approved" | "rejected";

/** A published review as the storefront renders it. The author is trimmed to a
 *  display name server-side — no email or full surname is ever sent. */
export interface Review {
  id: string;
  productId: string;
  rating: number;
  comment?: string;
  status: ReviewStatus;
  author: { name: string; image?: string };
  createdAt: string;
}

/** One of the signed-in user's own reviews, carrying the order it came from so
 *  the order detail page can match it to the right line item. */
export interface MyReview extends Review {
  orderNumber: string;
}

/** `GET /api/reviews/product/:slug` — the list plus the aggregate above it. */
export interface ProductReviewSummary {
  /** When true, an admin has hidden reviews for this product — render nothing. */
  hidden?: boolean;
  /** Mean of every approved rating — not just the loaded page. */
  average: number;
  /** Total approved reviews — not just the loaded page. */
  count: number;
  /** Approved review count keyed by star value, "1".."5". Covers all reviews. */
  distribution: Record<string, number>;
  /** One page of reviews, newest first. */
  reviews: Review[];
  page?: number;
  limit?: number;
  totalPages?: number;
  /** Whether more reviews exist beyond the loaded ones. */
  hasMore?: boolean;
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
  status:
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "returned"
    | "refunded";
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

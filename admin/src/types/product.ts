export interface Product {
  id: string;
  _id?: string;
  name: string;
  title?: string;
  description: string;
  seoDescription?: string;
  slug?: string;
  sku?: string;
  category: string | Category;
  price: number;
  listPrice?: number;
  discount?: number;
  currency?: string;
  stockQuantity?: number;
  inStock?: boolean;
  isActive?: boolean;
  brandId?: string;
  brand?: {
    id: string;
    name: string;
    logo?: string;
  };
  status?: "draft" | "published" | "archived" | string;
  tags?: string[];
  thumbnail?: string;
  img?: string;

  // Media from backend
  media?: {
    id: string;
    fileName: string;
    fileSize: number;
    mediaType: "image" | "video";
    mimeType: string;
    publicUrl: string;
    uploadedAt: Date;
  }[];

  // Legacy images field (for compatibility)
  images?: ProductImage[];

  // Stats
  reviewCount?: number;
  reviewRating?: number;
  excitementScore?: number;
  viewCount?: number;
  popularityScore?: number;
  wishlistCount?: number;
  salesCount?: number;

  // Relations
  relatedProductIds?: string[];
  relatedProducts?: any[];
  suggestedProductIds?: string[];
  suggestedProducts?: any[];

  // "It's a Steal Deal" — combo/bundle product
  isStealDeal?: boolean;
  originalProductIds?: string[];
  originalProducts?: any[];
  originalTotalPrice?: number;
  stealDealSavings?: number;
  colorImages?: { color: string; hexCode?: string; imageUrl: string }[];

  // Legacy fields
  originalPrice?: number;
  discountPrice?: number;
  discountPercentage?: number;
  quantity?: number;
  reviewsEnabled?: boolean;
  additionalInfo?: AdditionalInfoField[];
  seo?: SEOFields;
  preferredDeliveryPartnerId?: string;
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
    weight?: number;
  };

  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  order: number;
  isPrimary: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
}

export interface AdditionalInfoField {
  id: string;
  key: string;
  value: string;
}

export interface SEOFields {
  metaTitle?: string;
  metaDescription?: string;
  slug?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: Customer;
  items: OrderItem[];
  total: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  product: Product;
  quantity: number;
  price: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: Date;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  revenueChange: number;
  ordersChange: number;
  productsChange: number;
  customersChange: number;
}

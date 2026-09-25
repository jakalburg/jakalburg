// ---------------------------------------------------------------------------
// Mock datasets for the UI-only admin build.
//
// The real backend/database is intentionally NOT migrated. Every dataset here
// mirrors the exact shape the admin UI (services, hooks, components) expects,
// so screens render and interactions work against realistic local data. Swap
// the mock axios seam (`use-axios-auth`) back to a real instance to reconnect a
// backend later — none of these shapes need to change.
// ---------------------------------------------------------------------------

// Stable timestamps (avoid regenerating per-call so the demo data stays fixed).
const T = (daysAgo: number, hour = 10, minute = 0) => {
  const base = new Date("2026-08-21T00:00:00.000Z").getTime();
  const d = new Date(base - daysAgo * 24 * 60 * 60 * 1000);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
};

const img = (label: string, w = 600, h = 600) =>
  `https://placehold.co/${w}x${h}/eeeae6/1d0441?text=${encodeURIComponent(label)}`;

// ==================== CATEGORIES (service-local shape) ====================
export const mockCategories: any[] = [
  {
    id: "cat-rings",
    parent: "Rings",
    parentId: null,
    img: img("Rings"),
    productType: "rings",
    description: "Handcrafted rings for every occasion",
    status: "active",
    subCategories: [
      { id: "cat-rings-engagement", parent: "Engagement", parentId: "cat-rings", productType: "engagement-rings", status: "active" },
      { id: "cat-rings-stackable", parent: "Stackable", parentId: "cat-rings", productType: "stackable-rings", status: "active" },
    ],
    createdAt: T(120),
    updatedAt: T(12),
  },
  {
    id: "cat-earrings",
    parent: "Earrings",
    parentId: null,
    img: img("Earrings"),
    productType: "earrings",
    description: "Studs, hoops and statement earrings",
    status: "active",
    subCategories: [
      { id: "cat-earrings-studs", parent: "Studs", parentId: "cat-earrings", productType: "studs", status: "active" },
      { id: "cat-earrings-hoops", parent: "Hoops", parentId: "cat-earrings", productType: "hoops", status: "active" },
    ],
    createdAt: T(118),
    updatedAt: T(9),
  },
  {
    id: "cat-necklaces",
    parent: "Necklaces",
    parentId: null,
    img: img("Necklaces"),
    productType: "necklaces",
    description: "Pendants, chains and layered necklaces",
    status: "active",
    subCategories: [],
    createdAt: T(115),
    updatedAt: T(7),
  },
  {
    id: "cat-bracelets",
    parent: "Bracelets",
    parentId: null,
    img: img("Bracelets"),
    productType: "bracelets",
    description: "Cuffs, tennis bracelets and charms",
    status: "active",
    subCategories: [],
    createdAt: T(110),
    updatedAt: T(20),
  },
  {
    id: "cat-anklets",
    parent: "Anklets",
    parentId: null,
    img: img("Anklets"),
    productType: "anklets",
    description: "Delicate anklets and chains",
    status: "inactive",
    subCategories: [],
    createdAt: T(100),
    updatedAt: T(40),
  },
];

// ==================== BRANDS ====================
export const mockBrands: any[] = [
  { id: "brand-kay", name: "KAY Signature", logo: img("KAY"), website: "https://kaybykhushie.com", description: "The flagship in-house collection", status: "active", createdAt: T(200), updatedAt: T(15) },
  { id: "brand-aurelia", name: "Aurelia", logo: img("Aurelia"), website: "https://example.com", description: "Minimal gold-plated everyday pieces", status: "active", createdAt: T(180), updatedAt: T(18) },
  { id: "brand-lumen", name: "Lumen", logo: img("Lumen"), website: "https://example.com", description: "Lab-grown diamond specialists", status: "active", createdAt: T(160), updatedAt: T(22) },
  { id: "brand-noir", name: "Noir & Co.", logo: img("Noir"), website: "https://example.com", description: "Bold statement jewelry", status: "active", createdAt: T(140), updatedAt: T(30) },
  { id: "brand-heritage", name: "Heritage", logo: img("Heritage"), description: "Traditional temple jewelry", status: "inactive", createdAt: T(120), updatedAt: T(60) },
];

// ==================== COLLECTIONS ====================
export const mockCollections: any[] = [
  { id: "col-bridal", name: "Bridal Radiance", image: img("Bridal"), description: "Curated pieces for the big day", status: "active", createdAt: T(90), updatedAt: T(5) },
  { id: "col-everyday", name: "Everyday Essentials", image: img("Everyday"), description: "Lightweight daily wear", status: "active", createdAt: T(85), updatedAt: T(8) },
  { id: "col-festive", name: "Festive Edit", image: img("Festive"), description: "Celebration-ready sparkle", status: "active", createdAt: T(70), updatedAt: T(11) },
  { id: "col-minimal", name: "Minimal Muse", image: img("Minimal"), description: "Understated elegance", status: "active", createdAt: T(60), updatedAt: T(14) },
  { id: "col-archive", name: "The Archive", image: img("Archive"), description: "Past-season favourites", status: "inactive", createdAt: T(45), updatedAt: T(25) },
];

// ==================== PRODUCTS ====================
const PRODUCT_SEED: Array<[string, string, string, number, number, number, boolean, boolean, string[]]> = [
  // [id, name, categoryId, price, listPrice, stock, isActive, isStealDeal, tags]
  ["prod-01", "Solitaire Halo Ring", "cat-rings", 12999, 15999, 24, true, false, ["bestseller", "rings", "diamond"]],
  ["prod-02", "Twisted Vine Stackable Ring", "cat-rings", 4999, 5999, 60, true, false, ["stackable", "rings"]],
  ["prod-03", "Classic Diamond Studs", "cat-earrings", 8999, 10999, 40, true, false, ["earrings", "studs", "bestseller"]],
  ["prod-04", "Crescent Moon Hoops", "cat-earrings", 6499, 7999, 18, true, false, ["earrings", "hoops"]],
  ["prod-05", "Layered Chain Necklace", "cat-necklaces", 7499, 8999, 32, true, false, ["necklaces", "layered"]],
  ["prod-06", "Heart Locket Pendant", "cat-necklaces", 5499, 6499, 0, true, false, ["necklaces", "pendant"]],
  ["prod-07", "Tennis Bracelet", "cat-bracelets", 18999, 22999, 12, true, false, ["bracelets", "diamond", "luxury"]],
  ["prod-08", "Charm Cuff Bracelet", "cat-bracelets", 3999, 4999, 75, true, false, ["bracelets", "charm"]],
  ["prod-09", "Delicate Star Anklet", "cat-anklets", 2499, 2999, 50, false, false, ["anklets"]],
  ["prod-10", "Rose Gold Eternity Band", "cat-rings", 9999, 11999, 28, true, false, ["rings", "rose-gold"]],
  ["prod-11", "Pearl Drop Earrings", "cat-earrings", 5999, 6999, 22, true, false, ["earrings", "pearl"]],
  ["prod-12", "Emerald Pendant Set", "cat-necklaces", 14999, 17999, 9, true, false, ["necklaces", "emerald", "festive"]],
  ["prod-13", "Bridal Combo: Ring + Studs", "cat-rings", 18999, 26998, 15, true, true, ["steal-deal", "bridal", "combo"]],
  ["prod-14", "Festive Trio: Necklace + Earrings + Ring", "cat-necklaces", 24999, 34997, 8, true, true, ["steal-deal", "festive", "combo"]],
];

export const mockProducts: any[] = PRODUCT_SEED.map(
  ([id, name, categoryId, price, listPrice, stock, isActive, isStealDeal, tags], i) => {
    const brand = mockBrands[i % 4];
    return {
      id,
      _id: id,
      name,
      title: name,
      description: `${name} — crafted in 925 sterling silver with a premium anti-tarnish finish. A KAY by Khushie signature piece designed to last.`,
      seoDescription: `Buy ${name} online at KAY by Khushie. Free shipping and 30-day returns.`,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      sku: `KAY-${String(i + 1).padStart(4, "0")}`,
      category: categoryId,
      price,
      listPrice,
      discount: Math.round(((listPrice - price) / listPrice) * 100),
      currency: "INR",
      stockQuantity: stock,
      inStock: stock > 0,
      isActive,
      brandId: brand.id,
      brand: { id: brand.id, name: brand.name, logo: brand.logo },
      status: isActive ? "published" : "archived",
      tags,
      thumbnail: img(name.split(" ").slice(0, 2).join(" ")),
      img: img(name.split(" ").slice(0, 2).join(" ")),
      media: [
        {
          id: `${id}-m1`,
          fileName: `${id}-1.jpg`,
          fileSize: 184320,
          mediaType: "image",
          mimeType: "image/jpeg",
          publicUrl: img(name.split(" ").slice(0, 2).join(" ")),
          uploadedAt: T(30 - i),
        },
        {
          id: `${id}-m2`,
          fileName: `${id}-2.jpg`,
          fileSize: 201728,
          mediaType: "image",
          mimeType: "image/jpeg",
          publicUrl: img(`${name.split(" ")[0]} alt`),
          uploadedAt: T(30 - i),
        },
      ],
      images: [
        { id: `${id}-i1`, url: img(name.split(" ").slice(0, 2).join(" ")), alt: name, order: 0, isPrimary: true },
        { id: `${id}-i2`, url: img(`${name.split(" ")[0]} alt`), alt: `${name} alternate`, order: 1, isPrimary: false },
      ],
      reviewCount: 4 + ((i * 3) % 40),
      reviewRating: 3.8 + ((i % 12) / 10),
      excitementScore: 40 + ((i * 7) % 60),
      viewCount: 120 + i * 37,
      popularityScore: 50 + ((i * 11) % 50),
      wishlistCount: 5 + ((i * 4) % 30),
      salesCount: 2 + ((i * 5) % 45),
      relatedProductIds: [],
      suggestedProductIds: [],
      isStealDeal,
      originalProductIds: isStealDeal ? ["prod-01", "prod-03"] : [],
      originalProducts: [],
      originalTotalPrice: isStealDeal ? listPrice : undefined,
      stealDealSavings: isStealDeal ? listPrice - price : undefined,
      colorImages: [],
      additionalInfo: [
        { id: `${id}-a1`, key: "Material", value: "925 Sterling Silver" },
        { id: `${id}-a2`, key: "Warranty", value: "6 months" },
      ],
      seo: { metaTitle: name, metaDescription: `${name} by KAY`, slug: name.toLowerCase().replace(/\s+/g, "-") },
      dimensions: { width: 10, height: 10, depth: 3, weight: 8 + i },
      pageContent: {
        specification: "<p>925 Sterling Silver, Rhodium finish.</p>",
        compositionCare: "<p>Store in a dry place. Avoid contact with perfume.</p>",
        delivery: "<p>Ships in 2-4 business days.</p>",
        returnPolicy: "<p>30-day easy returns.</p>",
      },
      showReviews: true,
      createdAt: T(60 - i),
      updatedAt: T(15 - (i % 15)),
    };
  },
);

// ==================== CUSTOMERS ====================
const CUSTOMER_SEED = [
  ["Aisha Khan", "aisha.khan@example.com", "+91 98200 11223"],
  ["Rhea Kapoor", "rhea.kapoor@example.com", "+91 98200 22334"],
  ["Sara Mehta", "sara.mehta@example.com", "+91 98200 33445"],
  ["Ananya Rao", "ananya.rao@example.com", "+91 98200 44556"],
  ["Nisha Verma", "nisha.verma@example.com", "+91 98200 55667"],
  ["Priya Nair", "priya.nair@example.com", "+91 98200 66778"],
  ["Tara Singh", "tara.singh@example.com", "+91 98200 77889"],
  ["Meera Iyer", "meera.iyer@example.com", "+91 98200 88990"],
  ["Kavya Desai", "kavya.desai@example.com", "+91 98200 99001"],
  ["Diya Shah", "diya.shah@example.com", "+91 98200 10112"],
];

export const mockCustomers: any[] = CUSTOMER_SEED.map(([name, email, phone], i) => ({
  id: `cust-${String(i + 1).padStart(2, "0")}`,
  name,
  email,
  phone,
  avatar: img(name.split(" ").map((n) => n[0]).join(""), 96, 96),
  totalOrders: 1 + ((i * 3) % 12),
  totalSpent: 4999 + i * 3200,
  createdAt: T(150 - i * 10),
}));

// ==================== ORDERS (raw shape mapped by orders.service) ====================
const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];
const DELIVERY_STATUSES = ["pending", "pending", "shipped", "delivered", "cancelled"];

export const mockOrdersRaw: any[] = Array.from({ length: 14 }).map((_, i) => {
  const customer = mockCustomers[i % mockCustomers.length];
  const [firstName, ...rest] = customer.name.split(" ");
  const lastName = rest.join(" ");
  const status = ORDER_STATUSES[i % ORDER_STATUSES.length];
  const deliveryStatus = DELIVERY_STATUSES[i % DELIVERY_STATUSES.length];
  const products = [mockProducts[i % mockProducts.length], mockProducts[(i + 3) % mockProducts.length]];
  const items = products.map((p, j) => ({
    id: `ord-${i + 1}-item-${j + 1}`,
    productId: p.id,
    productName: p.name,
    name: p.name,
    quantity: 1 + (j % 2),
    price: p.price,
    image: p.thumbnail,
    thumbnail: p.thumbnail,
    sku: p.sku,
  }));
  const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
  const shippingCost = subtotal > 10000 ? 0 : 99;
  const discountAmount = i % 3 === 0 ? 500 : 0;
  const totalAmount = subtotal + shippingCost - discountAmount;
  const paymentMethod = i % 2 === 0 ? "razorpay" : "cod";
  return {
    id: `order-${String(i + 1).padStart(4, "0")}`,
    invoiceNumber: `INV-2026-${String(i + 1).padStart(4, "0")}`,
    invoiceSequence: i + 1,
    userId: customer.id,
    user: { id: customer.id, email: customer.email, name: customer.name },
    status,
    deliveryStatus,
    paymentMethod,
    paymentStatus: paymentMethod === "razorpay" ? "paid" : status === "delivered" ? "paid" : "pending",
    subtotalAmount: subtotal,
    shippingCost,
    discountAmount,
    walletPointsUsed: 0,
    walletAmountUsed: 0,
    onlineAmountPaid: paymentMethod === "razorpay" ? totalAmount : 0,
    codDueAmount: paymentMethod === "cod" ? totalAmount : 0,
    totalAmount,
    currency: "INR",
    trackingNumber: deliveryStatus === "shipped" || deliveryStatus === "delivered" ? `TRK${100000 + i}` : null,
    courierName: deliveryStatus === "shipped" || deliveryStatus === "delivered" ? "Delhivery" : null,
    shippingAddress: {
      firstName,
      lastName,
      email: customer.email,
      phone: customer.phone,
      addressLine1: `${12 + i} Rose Villa, Linking Road`,
      addressLine2: "Bandra West",
      city: "Mumbai",
      state: "Maharashtra",
      zipCode: `4000${String(10 + i).slice(-2)}`,
      country: "India",
    },
    items,
    orderNote: i % 4 === 0 ? "Please gift wrap." : "",
    createdAt: T(i * 2, 9 + (i % 8)),
    updatedAt: T(i, 11),
  };
});

export function mockOrderDetails(id: string) {
  const order = mockOrdersRaw.find((o) => o.id === id) || mockOrdersRaw[0];
  return {
    ...order,
    timeline: [
      { status: "placed", at: order.createdAt, note: "Order placed" },
      { status: order.status, at: order.updatedAt, note: `Marked ${order.status}` },
    ],
    returnResolution: null,
    razorpayPaymentId: order.paymentMethod === "razorpay" ? `pay_MockRzp${1000 + order.invoiceSequence}` : null,
  };
}

// ==================== REVIEWS ====================
export const mockReviews: any[] = Array.from({ length: 9 }).map((_, i) => {
  const product = mockProducts[i % mockProducts.length];
  const customer = mockCustomers[i % mockCustomers.length];
  const [firstName, ...rest] = customer.name.split(" ");
  return {
    id: `review-${String(i + 1).padStart(2, "0")}`,
    userId: customer.id,
    productId: product.id,
    rating: 5 - (i % 3),
    comment: [
      "Absolutely love this piece — sparkles beautifully!",
      "Great quality for the price. Fast delivery.",
      "Looks exactly like the photos. Very happy.",
      "Nice, but the clasp feels a little delicate.",
    ][i % 4],
    status: ["pending", "approved", "approved", "rejected"][i % 4],
    createdAt: T(20 - i),
    updatedAt: T(10 - (i % 10)),
    user: {
      id: customer.id,
      email: customer.email,
      image: customer.avatar,
      profiles: [{ firstName, lastName: rest.join(" ") }],
    },
    product: { id: product.id, name: product.name, thumbnail: product.thumbnail },
  };
});

// ==================== COUPONS ====================
export const mockCoupons: any[] = [
  { id: "coupon-1", couponCode: "WELCOME10", title: "Welcome Offer", discountType: "percentage", discountAmount: 10, minimumAmount: 1999, endDate: T(-30), status: "active", logo: img("10%"), usageCount: 142, maxUsage: 1000, productType: "all", createdAt: T(60), updatedAt: T(5) },
  { id: "coupon-2", couponCode: "FESTIVE500", title: "Festive Flat ₹500", discountType: "fixed", discountAmount: 500, minimumAmount: 4999, endDate: T(-15), status: "active", logo: img("500"), usageCount: 87, maxUsage: 500, productType: "all", createdAt: T(45), updatedAt: T(8) },
  { id: "coupon-3", couponCode: "BRIDAL15", title: "Bridal Edit 15%", discountType: "percentage", discountAmount: 15, minimumAmount: 9999, endDate: T(-45), status: "active", logo: img("15%"), usageCount: 34, maxUsage: 200, productType: "rings", createdAt: T(40), updatedAt: T(9) },
  { id: "coupon-4", couponCode: "FREESHIP", title: "Free Shipping", discountType: "fixed", discountAmount: 99, minimumAmount: 0, endDate: T(-10), status: "active", usageCount: 512, maxUsage: 5000, productType: "all", createdAt: T(30), updatedAt: T(3) },
  { id: "coupon-5", couponCode: "SUMMER20", title: "Summer Sale 20%", discountType: "percentage", discountAmount: 20, minimumAmount: 2999, endDate: T(20), status: "inactive", usageCount: 300, maxUsage: 300, productType: "all", createdAt: T(120), updatedAt: T(20) },
  { id: "coupon-6", couponCode: "NEWYEAR", title: "New Year Special", discountType: "fixed", discountAmount: 1000, minimumAmount: 7999, endDate: T(-60), status: "active", usageCount: 12, maxUsage: 250, productType: "all", createdAt: T(15), updatedAt: T(2) },
];

// ==================== LOGS ====================
const LOG_SEED: Array<[string, string, string, string, number]> = [
  ["Failed to process payment webhook", "payment_error", "critical", "server", 5],
  ["Product image upload timed out", "upload_failure", "warning", "admin", 12],
  ["Unhandled promise rejection in checkout", "runtime_error", "error", "client", 3],
  ["Rate limit exceeded on /products", "rate_limit", "warning", "server", 41],
  ["Invalid coupon code submitted", "validation_error", "info", "client", 88],
  ["Database connection pool exhausted", "db_error", "critical", "server", 2],
  ["404 on legacy route /shop/old", "not_found", "info", "client", 210],
  ["Email delivery bounced", "email_error", "error", "server", 7],
  ["Slow query detected on orders list", "performance", "warning", "server", 19],
  ["CSRF token mismatch", "security", "error", "server", 4],
];

export const mockLogs: any[] = LOG_SEED.map(([message, errorType, severity, source, count], i) => ({
  id: `log-${String(i + 1).padStart(3, "0")}`,
  message,
  stack: `Error: ${message}\n    at handler (/app/src/${source}/index.ts:${40 + i}:12)\n    at process (/app/node_modules/next/dist/server.js:120:9)`,
  errorType,
  severity,
  source,
  endpoint: ["/api/payment", "/api/media", "/checkout", "/api/products", "/api/coupon"][i % 5],
  method: ["POST", "POST", "GET", "GET", "POST"][i % 5],
  statusCode: [500, 408, 500, 429, 400, 503, 404, 502, 200, 403][i],
  requestId: `req_${1000 + i}`,
  userId: i % 3 === 0 ? mockCustomers[i % mockCustomers.length].id : undefined,
  userEmail: i % 3 === 0 ? mockCustomers[i % mockCustomers.length].email : undefined,
  userName: i % 3 === 0 ? mockCustomers[i % mockCustomers.length].name : undefined,
  ipAddress: `103.21.${i}.${100 + i}`,
  deviceType: i % 2 === 0 ? "desktop" : "mobile",
  browser: i % 2 === 0 ? "Chrome 128" : "Safari 17",
  os: i % 2 === 0 ? "Windows 11" : "iOS 18",
  screenSize: i % 2 === 0 ? "1920x1080" : "390x844",
  pageUrl: "https://kaybykhushie.com/checkout",
  appVersion: "1.0.0",
  environment: "production",
  metadata: { attempt: (i % 3) + 1 },
  fingerprint: `fp_${errorType}_${i}`,
  occurrenceCount: count,
  firstOccurredAt: T(30 - i),
  lastOccurredAt: T(i % 7),
  status: i % 3 === 0 ? "resolved" : "unresolved",
  resolvedAt: i % 3 === 0 ? T(i % 5) : undefined,
  resolvedByName: i % 3 === 0 ? "Admin User" : undefined,
  createdAt: T(30 - i),
  updatedAt: T(i % 7),
}));

// ==================== PAGES ====================
export const mockPages: any[] = [
  { id: "page-about", title: "About Us", slug: "about-us", content: "<h1>About KAY by Khushie</h1><p>Our story...</p>", status: "active", createdAt: T(200), updatedAt: T(10) },
  { id: "page-privacy", title: "Privacy Policy", slug: "privacy-policy", content: "<h1>Privacy Policy</h1><p>...</p>", status: "active", createdAt: T(200), updatedAt: T(30) },
  { id: "page-terms", title: "Terms & Conditions", slug: "terms-and-conditions", content: "<h1>Terms</h1><p>...</p>", status: "active", createdAt: T(200), updatedAt: T(30) },
  { id: "page-shipping", title: "Shipping & Returns", slug: "shipping-returns", content: "<h1>Shipping</h1><p>...</p>", status: "active", createdAt: T(150), updatedAt: T(12) },
  { id: "page-faq", title: "FAQ", slug: "faq", content: "<h1>FAQ</h1><p>...</p>", status: "inactive", createdAt: T(120), updatedAt: T(45) },
];

// ==================== NOTIFICATIONS ====================
export const mockNotifications: any[] = [
  { id: "notif-1", type: "order", title: "New order received", message: "Order INV-2026-0014 was placed by Diya Shah.", isRead: false, link: "/orders", createdAt: T(0, 8, 30) },
  { id: "notif-2", type: "stock", title: "Low stock alert", message: "Crescent Moon Hoops is running low (18 left).", isRead: false, link: "/products", createdAt: T(0, 7, 15) },
  { id: "notif-3", type: "review", title: "New review pending", message: "A review for Tennis Bracelet needs approval.", isRead: false, link: "/catalog", createdAt: T(1, 18, 0) },
  { id: "notif-4", type: "order", title: "Order shipped", message: "Order INV-2026-0011 was marked shipped.", isRead: true, link: "/orders", createdAt: T(2, 12, 0) },
  { id: "notif-5", type: "system", title: "Backup completed", message: "Nightly backup completed successfully.", isRead: true, link: "/logs", createdAt: T(3, 2, 0) },
  { id: "notif-6", type: "stock", title: "Out of stock", message: "Heart Locket Pendant is out of stock.", isRead: true, link: "/products", createdAt: T(4, 9, 0) },
];

export const mockNotificationSettings = {
  id: "notif-settings-1",
  userId: "1",
  emailOrderPlaced: true,
  emailOrderShipped: true,
  emailOrderCancelled: false,
  emailLowStock: true,
  inAppOrderPlaced: true,
  inAppOrderShipped: true,
  inAppOrderCancelled: true,
};

// ==================== ADMIN STAFF ====================
export const mockAdminStaff: any[] = [
  { id: "1", firstName: "Admin", lastName: "User", name: "Admin User", email: "admin@kaybykhushie.com", role: "super_admin", status: "active", createdAt: T(300), updatedAt: T(1) },
  { id: "staff-2", firstName: "Riya", lastName: "Sharma", name: "Riya Sharma", email: "riya@kaybykhushie.com", role: "admin", status: "active", createdAt: T(180), updatedAt: T(4) },
  { id: "staff-3", firstName: "Karan", lastName: "Patel", name: "Karan Patel", email: "karan@kaybykhushie.com", role: "manager", status: "active", createdAt: T(120), updatedAt: T(6) },
  { id: "staff-4", firstName: "Sneha", lastName: "Joshi", name: "Sneha Joshi", email: "sneha@kaybykhushie.com", role: "staff", status: "inactive", createdAt: T(90), updatedAt: T(30) },
];

// ==================== WALLET ====================
export const mockWalletUsers: any[] = mockCustomers.slice(0, 6).map((c, i) => ({
  id: c.id,
  name: c.name,
  email: c.email,
  phone: c.phone,
  balancePoints: 500 * (i + 1),
  totalCredited: 500 * (i + 1) + 1000,
  totalUsed: 1000,
}));

export function mockWalletDetail(userId: string) {
  const u = mockWalletUsers.find((w) => w.id === userId) || mockWalletUsers[0];
  return {
    wallet: {
      id: `wallet-${u.id}`,
      userId: u.id,
      balancePoints: u.balancePoints,
      totalCredited: u.totalCredited,
      totalUsed: u.totalUsed,
      totalExpired: 0,
      createdAt: T(200),
      updatedAt: T(2),
    },
    transactions: [
      { id: `wtx-${u.id}-1`, walletId: `wallet-${u.id}`, userId: u.id, type: "ADMIN_CREDIT", points: 1000, balanceBefore: 0, balanceAfter: 1000, reason: "Welcome bonus", createdAt: T(200) },
      { id: `wtx-${u.id}-2`, walletId: `wallet-${u.id}`, userId: u.id, type: "ORDER_PAYMENT", points: -1000, balanceBefore: 1000, balanceAfter: 0, reason: "Used on order", sourceOrderId: "order-0001", createdAt: T(120) },
      { id: `wtx-${u.id}-3`, walletId: `wallet-${u.id}`, userId: u.id, type: "RETURN_CREDIT", points: u.balancePoints, balanceBefore: 0, balanceAfter: u.balancePoints, reason: "Return credit", createdAt: T(20) },
    ],
    lots: [
      { id: `lot-${u.id}-1`, walletId: `wallet-${u.id}`, userId: u.id, originalPoints: u.balancePoints, remainingPoints: u.balancePoints, sourceType: "RETURN_CREDIT", reason: "Return credit", grantedAt: T(20), expiresAt: T(-345), expiryStatus: "active" },
    ],
  };
}

// ==================== CONTACT SUBMISSIONS ====================
export const mockContacts: Record<string, any[]> = {
  contact_us: [
    { id: "contact-1", name: "Aisha Khan", email: "aisha.khan@example.com", subject: "Order enquiry", message: "Hi, I'd like to know the delivery date for my order INV-2026-0014.", type: "contact_us", status: "unread", createdAt: T(0, 9, 12) },
    { id: "contact-2", name: "Rhea Kapoor", email: "rhea.kapoor@example.com", subject: "Ring sizing", message: "Do you offer resizing for the Solitaire Halo Ring?", type: "contact_us", status: "read", createdAt: T(2, 14, 30) },
    { id: "contact-3", name: "Sara Mehta", email: "sara.mehta@example.com", subject: "Bulk order", message: "I'm interested in a bulk order for a wedding. Can someone call me?", type: "contact_us", status: "unread", createdAt: T(3, 11, 5) },
  ],
  newsletter: [
    { id: "nl-1", name: "", email: "priya.nair@example.com", message: "", type: "newsletter", status: "unread", createdAt: T(0, 6, 0) },
    { id: "nl-2", name: "", email: "tara.singh@example.com", message: "", type: "newsletter", status: "read", createdAt: T(1, 8, 20) },
    { id: "nl-3", name: "", email: "meera.iyer@example.com", message: "", type: "newsletter", status: "read", createdAt: T(2, 9, 30) },
    { id: "nl-4", name: "", email: "kavya.desai@example.com", message: "", type: "newsletter", status: "unread", createdAt: T(4, 12, 0) },
  ],
};

// ==================== PROFILE (/profiles/me wrapper) ====================
export const mockProfile = {
  user: {
    id: "1",
    email: "admin@kaybykhushie.com",
    profiles: [
      {
        id: "profile-1",
        userId: "1",
        firstName: "Admin",
        lastName: "User",
        addressLine1: "KAY by Khushie HQ, 4th Floor",
        addressLine2: "Linking Road, Bandra West",
        city: "Mumbai",
        country: "India",
        zipCode: "400050",
      },
    ],
  },
};

// ==================== HOME SECTIONS ====================
export const mockHomeSections: any[] = [
  {
    id: "sec-hero", type: "HeroSlider", title: "Hero Slider", eyebrow: "", subtitle: "", enabled: true, order: 1, gridBg: false, paddingTop: true, paddingBottom: true,
    data: [
      { id: "slide-1", image: img("Shine Bright", 1920, 800), video: "", mobileImage: "", mobileVideo: "", subtitle: "New Arrivals", title: "Shine Bright", buttonText: "Rings", showButton: true, categoryId: "cat-rings", link: "/shop?category=cat-rings", navTitle: "Rings", showNavIcon: true, showNavTitle: true, navIcon: img("R", 100, 100) },
      { id: "slide-2", image: img("Festive Edit", 1920, 800), video: "", subtitle: "Celebration Ready", title: "Festive Edit", buttonText: "Necklaces", showButton: true, categoryId: "cat-necklaces", link: "/shop?category=cat-necklaces", navTitle: "Necklaces", showNavIcon: true, showNavTitle: true, navIcon: img("N", 100, 100) },
    ],
  },
  { id: "sec-shopcat", type: "ShopByCategory", title: "Shop By Collection", eyebrow: "Explore", subtitle: "Find your favourite", enabled: true, order: 2, gridBg: true, paddingTop: true, paddingBottom: true, data: { categories: mockCategories.slice(0, 4).map((c) => ({ id: c.id, name: c.parent, image: c.img })) } },
  { id: "sec-jewelry", type: "JewelryCollection", title: "Shop Collection", eyebrow: "Featured", subtitle: "Bestsellers this week", enabled: true, order: 3, gridBg: false, paddingTop: true, paddingBottom: true, data: { productIds: mockProducts.slice(0, 6).map((p) => p.id) } },
  { id: "sec-banner", type: "AnimatedBanner", title: "Animated Banner", eyebrow: "", subtitle: "", enabled: true, order: 4, gridBg: false, paddingTop: false, paddingBottom: false, data: { messages: ["Free shipping over ₹10,000", "30-day easy returns", "Anti-tarnish guarantee"] } },
  { id: "sec-agirl", type: "AGirlInKay", title: "A Girl In KAY", eyebrow: "Trends", subtitle: "As seen on you", enabled: true, order: 5, gridBg: false, paddingTop: true, paddingBottom: true, data: { items: [{ id: "trend-1", image: img("Trend 1"), link: "/shop" }, { id: "trend-2", image: img("Trend 2"), link: "/shop" }] } },
  { id: "sec-gift", type: "GiftWrapping", title: "Gift Wrapping", eyebrow: "Add a touch", subtitle: "Make it special", enabled: true, order: 6, gridBg: true, paddingTop: true, paddingBottom: true, data: { image: img("Gift"), heading: "Complimentary Gift Wrapping", description: "Every order arrives beautifully packaged." } },
  { id: "sec-stories", type: "CategoryStories", title: "Category Stories", eyebrow: "", subtitle: "", enabled: true, order: 7, gridBg: false, paddingTop: true, paddingBottom: true, data: { stories: mockCategories.slice(0, 3).map((c) => ({ id: c.id, title: c.parent, image: c.img, link: `/shop?category=${c.id}` })) } },
  { id: "sec-reviews", type: "Reviews", title: "What Our Customers Say", eyebrow: "Reviews", subtitle: "Loved by thousands", enabled: true, order: 8, gridBg: true, paddingTop: true, paddingBottom: true, data: { reviewIds: mockReviews.slice(0, 4).map((r) => r.id) } },
  { id: "sec-founder", type: "KnowOurFounder", title: "Know Our Founder", eyebrow: "Our Story", subtitle: "", enabled: true, order: 9, gridBg: false, paddingTop: true, paddingBottom: true, data: { name: "Khushie", description: "Passionate about crafting jewelry that tells a story.", image: img("Founder") } },
  { id: "sec-footer", type: "Footer", title: "Footer", eyebrow: "", subtitle: "", enabled: true, order: 10, gridBg: false, paddingTop: false, paddingBottom: false, data: { newsletterHeading: "Join the KAY circle", newsletterText: "Get 10% off your first order." } },
];

// ==================== WEBSITE ABOUT / CONTACT PAGES ====================
export const mockAbout = {
  id: "about-1",
  subtitle: "Our Story",
  title: "Crafted with love, worn with pride",
  description: "KAY by Khushie began as a small studio and grew into a beloved jewelry house.",
  imageMain: img("About Main", 1200, 800),
  videoMain: "",
  imageSub: img("About Sub"),
  founderQuote: "Every piece should feel personal.",
  founderText: "Khushie, Founder",
  showcase: { items: [] },
  strategy: { points: ["Ethically sourced", "Handcrafted", "Anti-tarnish"] },
  whyUs: { points: ["Free shipping", "30-day returns", "Lifetime plating warranty"] },
};

export const mockContactPage = {
  id: "contact-page-1",
  contactImage: img("Contact", 1200, 800),
  subtitle: "Get in touch",
  title: "We'd love to hear from you",
  formTitle: "Send us a message",
  formDescription: "Our team typically replies within 24 hours.",
  needTodayTitle: "Need it today?",
  needTodayDescription: "Call us at +91 98200 00000 for express help.",
};

// ==================== SETTINGS ====================
export const mockSettings = {
  id: "settings-1",
  shippingCost: 99,
  taxRate: 3,
  currency: "INR",
  enableAlternatingBg: true,
  enablePlainBg: false,
  logo: img("KAY", 200, 80),
  storeName: "KAY by Khushie",
  storeEmail: "hello@kaybykhushie.com",
  storePhone: "+91 98200 00000",
  storeAddress: "Linking Road, Bandra West, Mumbai 400050",
  storeDescription: "Handcrafted 925 sterling silver jewelry.",
  homeCategory: "cat-rings",
  storeMapLink: "https://maps.google.com/?q=Bandra+West+Mumbai",
  enableCOD: true,
  enableRazorpay: true,
  enablePartialCOD: false,
  partialCODMode: "percentage",
  partialCODFixedAmountPaise: 20000,
  partialCODPercentage: 20,
  enableWhatsApp: true,
  whatsappNumber: "+91 98200 00000",
  razorpayKeyId: "rzp_test_XXXXXXXXXXXX",
  isRazorpayKeySecretSet: true,
  facebookUrl: "https://facebook.com/kaybykhushie",
  instagramUrl: "https://instagram.com/kaybykhushie",
  twitterUrl: "",
  linkedinUrl: "",
  youtubeUrl: "",
  storageProvider: "r2",
  isCloudinaryConfigured: false,
  isR2Configured: true,
  r2BucketName: "kay-media",
  r2PublicUrl: "https://media.kaybykhushie.com",
  r2StorageLimitBytes: 5 * 1024 * 1024 * 1024,
  redisEnabled: true,
  isRedisConfigured: true,
  smtpHost: "smtp.example.com",
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: "no-reply@kaybykhushie.com",
  smtpFromEmail: "no-reply@kaybykhushie.com",
  smtpFromName: "KAY by Khushie",
  isSmtpConfigured: true,
  showCoupon: true,
  showCountdown: true,
  countdownTitle: "Festive Sale ends in",
  countdownMessage: "Up to 30% off sitewide",
  countdownTargetAt: T(-14),
  countdownTimezone: "Asia/Kolkata",
  contactImage: img("Contact"),
  aboutSubtitle: "Our Story",
  aboutTitle: "Crafted with love",
  aboutDescription: "KAY by Khushie began as a small studio.",
  aboutImageMain: img("About"),
  aboutImageSub: img("About Sub"),
  founderQuote: "Every piece should feel personal.",
  founderText: "Khushie, Founder",
};

// ==================== DASHBOARD ====================
export const mockDashboardStats = {
  totalRevenue: 1284500,
  totalOrders: 342,
  totalProducts: mockProducts.length,
  totalCustomers: mockCustomers.length,
  revenueChange: 12.4,
  ordersChange: 8.1,
  productsChange: 3.0,
  customersChange: 15.7,
};

export const mockSalesData = [
  { name: "Sep", revenue: 82000, orders: 24 },
  { name: "Oct", revenue: 96500, orders: 31 },
  { name: "Nov", revenue: 141000, orders: 44 },
  { name: "Dec", revenue: 188000, orders: 58 },
  { name: "Jan", revenue: 112000, orders: 36 },
  { name: "Feb", revenue: 99000, orders: 29 },
  { name: "Mar", revenue: 123500, orders: 40 },
  { name: "Apr", revenue: 134000, orders: 43 },
  { name: "May", revenue: 151000, orders: 47 },
  { name: "Jun", revenue: 168500, orders: 52 },
  { name: "Jul", revenue: 176000, orders: 55 },
  { name: "Aug", revenue: 129500, orders: 41 },
];

// ==================== REDIS / STORAGE (settings widgets) ====================
export const mockRedisStats = {
  connected: true,
  hits: 18420,
  misses: 1203,
  hitRate: 0.938,
  keys: 214,
  memoryUsed: "12.4 MB",
  uptimeSeconds: 864000,
};

export const mockRedisKeys: any[] = [
  { key: "products:list:page-1", ttl: 300, size: "4.2 KB" },
  { key: "settings:admin", ttl: 600, size: "1.1 KB" },
  { key: "home-sections:all", ttl: 3600, size: "8.7 KB" },
  { key: "dashboard:stats", ttl: 120, size: "0.3 KB" },
];

export const mockStorageUsage = {
  provider: "r2",
  usedBytes: 1.2 * 1024 * 1024 * 1024,
  limitBytes: 5 * 1024 * 1024 * 1024,
  fileCount: 486,
  usedPercent: 24,
};

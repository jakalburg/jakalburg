import type { MockOrder } from "@/types";

// Seeded orders used as a fallback so the account has content before the
// user checks out. The order store merges these on first hydration.
export const seedOrders: MockOrder[] = [
  {
    id: "VH-284917",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    status: "delivered",
    email: "guest@jakalburg.example",
    paymentLabel: "Card ending •••• 4242",
    subtotal: 4780,
    shipping: 0,
    discount: 0,
    total: 4780,
    items: [
      {
        productId: "w-ivory-tee",
        slug: "signature-ivory-tee",
        title: "Signature Cotton Tee",
        image:
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80",
        price: 1490,
        size: "M",
        color: "Ivory",
        quantity: 2,
      },
      {
        productId: "w-knit-cardigan",
        slug: "merino-cardigan",
        title: "Fine Merino Cardigan",
        image:
          "https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?auto=format&fit=crop&w=600&q=80",
        price: 1800,
        size: "S",
        color: "Ivory",
        quantity: 1,
      },
    ],
    address: {
      id: "seed-addr-1",
      fullName: "Jakalburg Guest",
      line1: "42 Linking Road",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400050",
      phone: "+91 98765 43210",
    },
  },
  {
    id: "VH-284563",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    status: "shipped",
    email: "guest@jakalburg.example",
    paymentLabel: "Cash on Delivery",
    subtotal: 5990,
    shipping: 149,
    discount: 0,
    total: 6139,
    items: [
      {
        productId: "m-overshirt",
        slug: "wool-overshirt",
        title: "Wool Flannel Overshirt",
        image:
          "https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?auto=format&fit=crop&w=600&q=80",
        price: 5990,
        size: "M",
        color: "Charcoal",
        quantity: 1,
      },
    ],
    address: {
      id: "seed-addr-2",
      fullName: "Jakalburg Guest",
      line1: "27, MG Road",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      phone: "+91 98123 45678",
    },
  },
];

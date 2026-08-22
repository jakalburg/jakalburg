export interface Faq {
  question: string;
  answer: string;
}

export const faqs: { section: string; items: Faq[] }[] = [
  {
    section: "Orders",
    items: [
      {
        question: "How long will my order take?",
        answer:
          "Standard shipping arrives in 3–5 business days. Express arrives in 1–2. You'll receive a confirmation once your order ships.",
      },
      {
        question: "Can I change or cancel my order?",
        answer:
          "You can edit or cancel any order within one hour of placing it, straight from your account. After that we've started packing.",
      },
    ],
  },
  {
    section: "Shipping & returns",
    items: [
      {
        question: "Do you ship worldwide?",
        answer:
          "We ship across India, and to over 60 countries. International shipping rates are calculated at checkout.",
      },
      {
        question: "What is your return policy?",
        answer:
          "Unworn pieces with tags can be returned within 30 days for a full refund. Final-sale pieces are marked at the product page.",
      },
    ],
  },
  {
    section: "Product & fit",
    items: [
      {
        question: "How do your sizes run?",
        answer:
          "Most pieces run true to size, cut for a relaxed body. Detailed measurements live on every product page.",
      },
      {
        question: "How should I care for my pieces?",
        answer:
          "Care instructions are printed on the label and listed on every product page. Cold washes and line drying will always extend a garment's life.",
      },
    ],
  },
  {
    section: "Account",
    items: [
      {
        question: "Do I need an account to shop?",
        answer:
          "No — you can check out as a guest. An account lets you track orders, save addresses, and keep a wishlist.",
      },
    ],
  },
];

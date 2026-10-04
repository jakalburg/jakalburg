/**
 * Razorpay's browser checkout.
 *
 * Loaded from Razorpay's CDN on demand rather than bundled: it must come from
 * their domain to stay PCI-compliant, and a shopper paying COD should never
 * download it at all.
 */

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/** What Razorpay hands back when a payment succeeds. */
export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

let loader: Promise<void> | null = null;

/** Load checkout.js once, reusing the same promise across calls. */
export function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay is browser-only"));
  }
  if (window.Razorpay) return Promise.resolve();
  if (loader) return loader;

  loader = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Let a later attempt retry rather than caching the failure forever.
      loader = null;
      reject(new Error("Could not load the payment window. Check your connection."));
    };
    document.body.appendChild(script);
  });

  return loader;
}

/**
 * Open Razorpay's payment window and settle when it closes.
 *
 * Resolves with the payment on success, or `null` if the shopper dismissed it
 * — a dismissal is a normal outcome, not an error, and must leave the cart
 * untouched so they can try again.
 */
export async function openRazorpayCheckout(
  options: Omit<RazorpayOptions, "handler" | "modal">,
): Promise<RazorpaySuccess | null> {
  await loadRazorpay();
  if (!window.Razorpay) {
    throw new Error("Could not load the payment window. Please try again.");
  }

  return new Promise<RazorpaySuccess | null>((resolve) => {
    let settled = false;
    const finish = (result: RazorpaySuccess | null) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const checkout = new window.Razorpay!({
      ...options,
      handler: (response) => finish(response),
      // Razorpay fires ondismiss on close — including after a success on some
      // flows, hence the `settled` guard so a real payment isn't lost.
      modal: { ondismiss: () => finish(null) },
    });

    checkout.open();
  });
}

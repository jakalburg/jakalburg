import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Pencil } from "lucide-react";
import { z } from "zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { selectCartItems, selectCartSubtotal, clear_cart } from "@/redux/features/cart-slice";
import { selectProfile, selectAddresses, add_address, update_profile, type Profile } from "@/redux/features/addresses-slice";
import { selectAuthUser } from "@/redux/features/auth-slice";
import { useCreateOrder } from "@/hooks/useOrders";
import { apiFetch, ApiError } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { formatINR } from "@/lib/format";
import { getLocalStorage, setLocalStorage } from "@/utils/localstorage";
import { useHydrated } from "@/hooks/useHydrated";
import type { Address } from "@/types";
import { DemoBanner } from "@/components/common/DemoBanner";
import { suppressNextRouteLoader } from "@/components/common/route-loader";

// Server response from POST /coupons/validate.
interface ValidateCouponResult {
  valid: boolean;
  message: string;
  discountAmount: number;
  couponCode?: string;
  discountType?: "percentage" | "fixed";
}

// A coupon the shopper has successfully applied to this checkout.
interface AppliedCoupon {
  code: string;
  discount: number;
}

const contactSchema = z.object({
  email: z.string().email("Enter a valid email"),
});
const addressSchema = z.object({
  fullName: z.string().min(2, "Enter your name"),
  line1: z.string().min(3, "Enter your address"),
  line2: z.string().optional(),
  city: z.string().min(2, "Required"),
  state: z.string().min(2, "Required"),
  pincode: z.string().regex(/^\d{6}$/, "Enter a 6-digit PIN"),
  phone: z.string().min(7, "Enter a valid phone number"),
});
type ContactForm = z.infer<typeof contactSchema>;
type AddressForm = z.infer<typeof addressSchema>;

type Step = "contact" | "address" | "shipping" | "payment" | "review";
type Shipping = "standard" | "express";
type PayMethod = "card" | "upi" | "cod";

const shippingRates: Record<Shipping, { label: string; price: number; eta: string }> = {
  standard: { label: "Standard", price: 0, eta: "3–5 business days" },
  express: { label: "Express", price: 199, eta: "1–2 business days" },
};

// Persisted checkout choices, so a shopper who has been through the flow once
// lands straight on "review" next time instead of re-walking every step. Only
// the *choices* live here — never card/UPI details (see the payment section).
// Email lives in the address book's `profile`; the shipping address in the
// address book itself. This record just holds which address + the two method
// picks, plus a flag that the shopper completed the flow at least once.
const CHECKOUT_PREFS_KEY = "checkout_prefs";

interface CheckoutPrefs {
  completed: boolean;
  addressId: string;
  shipping: Shipping;
  payMethod: PayMethod;
}

export function CheckoutFlow() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const items = useAppSelector(selectCartItems);
  const subtotal = useAppSelector(selectCartSubtotal);
  const profile = useAppSelector(selectProfile);
  const savedAddresses = useAppSelector(selectAddresses);
  const user = useAppSelector(selectAuthUser);
  const hydrated = useHydrated();
  const createOrder = useCreateOrder();
  const clearCart = () => dispatch(clear_cart());
  const addAddress = (a: Address) => dispatch(add_address(a));
  const updateProfile = (patch: Partial<Profile>) => dispatch(update_profile(patch));

  const [step, setStep] = useState<Step>("contact");
  const [contact, setContact] = useState<ContactForm>({ email: user?.email ?? profile.email ?? "" });
  // The chosen shipping address — a full saved Address (picked from the book or
  // just added). Saved once, then reused; the order snapshots it server-side.
  const [address, setAddress] = useState<Address | null>(null);
  // Address step UI: pick a saved address, or reveal the form to add a new one.
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [shipping, setShipping] = useState<Shipping>("standard");
  const [payMethod, setPayMethod] = useState<PayMethod>("card");

  // Coupon: the shopper types a code and applies it; the server prices the
  // discount against the live subtotal (we never trust a client-computed
  // amount). The applied discount is re-validated on "Place order" server-side.
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Preselect the default (or first) saved address once the book hydrates.
  useEffect(() => {
    if (!selectedAddressId && savedAddresses.length > 0) {
      const preferred = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
      setSelectedAddressId(preferred.id);
    }
  }, [savedAddresses, selectedAddressId]);

  // Returning shopper: if they completed checkout before and every saved choice
  // still resolves, drop them straight on "review" rather than re-walking the
  // four steps. Runs once, after hydration, and only when the address book has
  // loaded — a missing/deleted address quietly falls back to the normal flow.
  // Back buttons and the per-field edit icons remain the way out of "review".
  const autoJumpedRef = useRef(false);
  useEffect(() => {
    if (!hydrated || autoJumpedRef.current) return;

    const prefs = getLocalStorage<CheckoutPrefs | null>(CHECKOUT_PREFS_KEY, null);
    // Never jump into review over an empty bag — the empty-cart branch wins.
    if (!prefs?.completed || items.length === 0) {
      autoJumpedRef.current = true;
      return;
    }

    const savedAddress = savedAddresses.find((a) => a.id === prefs.addressId);
    if (!savedAddress) {
      // Book still hydrating → try again on the next change; genuinely gone →
      // give up and let the shopper pick again from the top.
      if (savedAddresses.length > 0) autoJumpedRef.current = true;
      return;
    }

    const email = contact.email || user?.email || profile.email || "";
    if (!email) {
      autoJumpedRef.current = true;
      return;
    }

    autoJumpedRef.current = true;
    if (email !== contact.email) setContact({ email });
    setAddress(savedAddress);
    setSelectedAddressId(savedAddress.id);
    setShipping(prefs.shipping);
    setPayMethod(prefs.payMethod);
    setStep("review");
  }, [hydrated, savedAddresses, items.length, contact.email, user?.email, profile.email]);

  // Remember the completed set of choices so the next visit can skip to review.
  // Card/UPI inputs are deliberately excluded — only the payment *method* is kept.
  const rememberCheckoutChoices = (chosen: Address) => {
    setLocalStorage<CheckoutPrefs>(CHECKOUT_PREFS_KEY, {
      completed: true,
      addressId: chosen.id,
      shipping,
      payMethod,
    });
  };

  // Transient payment inputs — NEVER written to any store or the mock order
  // beyond a masked display label at review time.
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [upi, setUpi] = useState("");

  const contactForm = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: contact,
  });
  const addressForm = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: address ?? { fullName: user?.name ?? "", line1: "", city: "", state: "", pincode: "", phone: "" },
  });

  const shippingCost = shippingRates[shipping].price;
  // Cap the discount at the subtotal so the total never goes negative — matches
  // the server, which clamps the same way.
  const discount = Math.min(appliedCoupon?.discount ?? 0, subtotal);
  const total = Math.max(0, subtotal + shippingCost - discount);

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code || couponLoading) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const result = await apiFetch<ValidateCouponResult>(
        API_ENDPOINTS.coupons.validate,
        { method: "POST", body: { code, subtotal } },
      );
      if (!result.valid) {
        setAppliedCoupon(null);
        setCouponError(result.message || "This coupon can't be applied.");
        return;
      }
      setAppliedCoupon({
        code: result.couponCode ?? code.toUpperCase(),
        discount: result.discountAmount,
      });
      toast.success("Coupon applied");
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(
        err instanceof ApiError ? err.message : "Couldn't check that coupon.",
      );
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
    setCouponInput("");
  };

  const paymentLabel = (): string => {
    if (payMethod === "cod") return "Cash on Delivery";
    if (payMethod === "upi") {
      const handle = upi.split("@")[1];
      return handle ? `UPI · @${handle}` : "UPI";
    }
    const last4 = cardNumber.replace(/\s/g, "").slice(-4) || "4242";
    return `Card ending •••• ${last4}`;
  };

  const onContact: SubmitHandler<ContactForm> = (data) => {
    setContact(data);
    updateProfile({ email: data.email });
    setStep("address");
  };
  // Add a new address: persist it to the account's address book (mirrored to
  // the server by AccountSync) once, then use it for this order.
  const onAddress: SubmitHandler<AddressForm> = (data) => {
    const record: Address = {
      id: `addr-${Date.now()}`,
      ...data,
      isDefault: savedAddresses.length === 0,
    };
    addAddress(record);
    setAddress(record);
    setSelectedAddressId(record.id);
    setShowNewAddress(false);
    setStep("shipping");
  };

  // Continue with an already-saved address — no re-save.
  const onUseSaved = () => {
    const chosen = savedAddresses.find((a) => a.id === selectedAddressId);
    if (!chosen) {
      toast.error("Please select an address");
      return;
    }
    setAddress(chosen);
    setStep("shipping");
  };

  const placeOrder = () => {
    if (!address || createOrder.isPending) return;
    // The address is already saved to the book; the order snapshots it server-side.
    createOrder.mutate(
      {
        // Only identity + quantity travel to the server; it prices the order
        // from the live products so the client can't tamper with totals.
        items: items.map((i) => ({
          productId: i.productId,
          size: i.size,
          color: i.color,
          quantity: i.quantity,
        })),
        shipping: shippingCost,
        // The server recomputes the discount from couponCode; discount is sent
        // only for display parity and is ignored server-side.
        discount,
        couponCode: appliedCoupon?.code,
        address,
        email: contact.email,
        paymentLabel: paymentLabel(),
      },
      {
        onSuccess: (order) => {
          // Clear all payment inputs so nothing lingers beyond the masked label.
          setCardNumber("");
          setCardExpiry("");
          setCardCvv("");
          setUpi("");
          suppressNextRouteLoader();
          // Defer clearing the cart until the redirect lands. Clearing it now
          // empties the cart while the checkout page is still mounted, so it
          // re-renders into its empty-bag branch and flashes "your bag is empty"
          // for a beat before navigation completes.
          void router.push(`/order-confirmation/${order.id}`).then(() => clearCart());
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Could not place your order.");
        },
      },
    );
  };

  // Per-field edit affordance on the review step — jump back to the step that
  // owns a detail, tweak it, then continue. Matters most for the returning
  // shopper who was dropped straight on review.
  const editField = (label: string, target: Step) => (
    <button
      type="button"
      onClick={() => setStep(target)}
      aria-label={`Edit ${label}`}
      className="text-mute-text transition-colors hover:text-foreground"
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>
  );

  const stepOrder: Step[] = ["contact", "address", "shipping", "payment", "review"];
  const stepIdx = stepOrder.indexOf(step);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div>
        <DemoBanner text="Your order is placed for real and saved to your order history — only payment is simulated, so you won't be charged." />
        <ol className="mt-6 mb-8 flex flex-wrap gap-4 text-xs">
          {stepOrder.map((s, i) => (
            <li
              key={s}
              className={`eyebrow ${i <= stepIdx ? "text-foreground" : "text-mute-text"}`}
            >
              {i + 1}. {s}
            </li>
          ))}
        </ol>

        {step === "contact" && (
          <form onSubmit={contactForm.handleSubmit(onContact)} className="max-w-md space-y-4">
            <h2 className="text-xl">Contact</h2>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...contactForm.register("email")} />
              {contactForm.formState.errors.email && (
                <p className="mt-1 text-xs text-destructive">{contactForm.formState.errors.email.message}</p>
              )}
            </div>
            <Button type="submit">Continue to address</Button>
          </form>
        )}

        {step === "address" && (
          <div className="max-w-xl space-y-4">
            <h2 className="text-xl">Shipping address</h2>

            {savedAddresses.length > 0 && !showNewAddress ? (
              /* Reuse a saved address — no need to re-type it every time. */
              <>
                <RadioGroup value={selectedAddressId} onValueChange={setSelectedAddressId} className="gap-3">
                  {savedAddresses.map((a) => (
                    <label key={a.id} className="flex cursor-pointer items-start gap-3 border p-4">
                      <RadioGroupItem value={a.id} id={`addr-${a.id}`} className="mt-1" />
                      <div className="flex-1 text-sm">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{a.fullName}</p>
                          {a.isDefault && (
                            <span className="border px-2 py-0.5 text-[10px] uppercase tracking-widest text-mute-text">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="mt-1">{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
                        <p>{a.city}, {a.state} {a.pincode}</p>
                        <p className="text-mute-text">{a.phone}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
                <Button variant="outline" type="button" onClick={() => setShowNewAddress(true)}>
                  + Add new address
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" type="button" onClick={() => setStep("contact")}>Back</Button>
                  <Button type="button" onClick={onUseSaved} disabled={!selectedAddressId}>
                    Continue to shipping
                  </Button>
                </div>
              </>
            ) : (
              <form onSubmit={addressForm.handleSubmit(onAddress)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input id="fullName" {...addressForm.register("fullName")} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="line1">Address line 1</Label>
                    <Input id="line1" {...addressForm.register("line1")} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="line2">Address line 2 (optional)</Label>
                    <Input id="line2" {...addressForm.register("line2")} />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" {...addressForm.register("city")} />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input id="state" {...addressForm.register("state")} />
                  </div>
                  <div>
                    <Label htmlFor="pincode">PIN code</Label>
                    <Input id="pincode" inputMode="numeric" {...addressForm.register("pincode")} />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" type="tel" {...addressForm.register("phone")} />
                  </div>
                </div>
                {Object.values(addressForm.formState.errors).some(Boolean) && (
                  <p className="text-xs text-destructive">Please complete the highlighted fields.</p>
                )}
                <div className="flex gap-2">
                  {savedAddresses.length > 0 ? (
                    <Button variant="outline" type="button" onClick={() => setShowNewAddress(false)}>Back</Button>
                  ) : (
                    <Button variant="outline" type="button" onClick={() => setStep("contact")}>Back</Button>
                  )}
                  <Button type="submit">{savedAddresses.length > 0 ? "Save & continue" : "Continue to shipping"}</Button>
                </div>
              </form>
            )}
          </div>
        )}

        {step === "shipping" && (
          <div className="max-w-md space-y-4">
            <h2 className="text-xl">Shipping method</h2>
            <RadioGroup value={shipping} onValueChange={(v) => setShipping(v as Shipping)}>
              {(Object.keys(shippingRates) as Shipping[]).map((k) => (
                <label key={k} className="flex cursor-pointer items-center gap-3 border p-4">
                  <RadioGroupItem value={k} id={`ship-${k}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{shippingRates[k].label}</p>
                    <p className="text-xs text-mute-text">{shippingRates[k].eta}</p>
                  </div>
                  <p className="text-sm">
                    {shippingRates[k].price === 0 ? "Free" : formatINR(shippingRates[k].price)}
                  </p>
                </label>
              ))}
            </RadioGroup>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("address")}>Back</Button>
              <Button onClick={() => setStep("payment")}>Continue to payment</Button>
            </div>
          </div>
        )}

        {step === "payment" && (
          <div className="max-w-md space-y-4">
            <h2 className="text-xl">Payment</h2>
            <DemoBanner text="No payment details are stored. This is a demo." />
            <RadioGroup value={payMethod} onValueChange={(v) => setPayMethod(v as PayMethod)}>
              <label className="flex items-center gap-3 border p-4">
                <RadioGroupItem value="card" id="pm-card" /> <span>Credit or debit card</span>
              </label>
              <label className="flex items-center gap-3 border p-4">
                <RadioGroupItem value="upi" id="pm-upi" /> <span>UPI</span>
              </label>
              <label className="flex items-center gap-3 border p-4">
                <RadioGroupItem value="cod" id="pm-cod" /> <span>Cash on Delivery</span>
              </label>
            </RadioGroup>

            {payMethod === "card" && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="cardNumber">Card number</Label>
                  <Input
                    id="cardNumber"
                    inputMode="numeric"
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="expiry">Expiry</Label>
                    <Input
                      id="expiry"
                      placeholder="MM / YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      inputMode="numeric"
                      placeholder="123"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>
            )}

            {payMethod === "upi" && (
              <div>
                <Label htmlFor="upi">UPI ID</Label>
                <Input
                  id="upi"
                  placeholder="name@bank"
                  value={upi}
                  onChange={(e) => setUpi(e.target.value)}
                  autoComplete="off"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("shipping")}>Back</Button>
              <Button
                onClick={() => {
                  // All four choices are settled by now — persist them so a
                  // return visit lands on review instead of the first step.
                  if (address) rememberCheckoutChoices(address);
                  setStep("review");
                }}
              >
                Review order
              </Button>
            </div>
          </div>
        )}

        {step === "review" && address && (
          <div className="max-w-xl space-y-6">
            <h2 className="text-xl">Review</h2>
            <div className="grid gap-4 border p-4 text-sm">
              <div>
                <div className="flex items-center justify-between">
                  <p className="eyebrow text-mute-text">Contact</p>
                  {editField("contact", "contact")}
                </div>
                <p>{contact.email}</p>
              </div>
              <Separator />
              <div>
                <div className="flex items-center justify-between">
                  <p className="eyebrow text-mute-text">Ship to</p>
                  {editField("shipping address", "address")}
                </div>
                <p>{address.fullName}</p>
                <p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
                <p>{address.city}, {address.state} {address.pincode}</p>
                <p>{address.phone}</p>
              </div>
              <Separator />
              <div>
                <div className="flex items-center justify-between">
                  <p className="eyebrow text-mute-text">Shipping</p>
                  {editField("shipping method", "shipping")}
                </div>
                <p>{shippingRates[shipping].label} · {shippingRates[shipping].eta}</p>
              </div>
              <Separator />
              <div>
                <div className="flex items-center justify-between">
                  <p className="eyebrow text-mute-text">Payment</p>
                  {editField("payment", "payment")}
                </div>
                <p>{paymentLabel()}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("payment")}>Back</Button>
              <Button onClick={placeOrder} loading={createOrder.isPending} disabled={items.length === 0}>
                Place order
              </Button>
            </div>
          </div>
        )}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="border p-5">
          <p className="eyebrow mb-4 text-mute-text">Order summary</p>
          <ul className="space-y-3">
            {items.map((i) => (
              <li key={`${i.productId}-${i.size}-${i.color}`} className="flex gap-3 text-sm">
                <ImageShimmer src={i.image} alt="" aria-hidden="true" wrapperClassName="h-16 w-14" className="object-cover" />
                <div className="flex-1">
                  <p className="font-medium">{i.title}</p>
                  <p className="text-xs text-mute-text">{i.color} · {i.size} · Qty {i.quantity}</p>
                </div>
                <p>{formatINR(i.price * i.quantity)}</p>
              </li>
            ))}
          </ul>
          <Separator className="my-4" />

          {/* Coupon */}
          <div className="mb-4">
            {appliedCoupon ? (
              <div className="flex items-center justify-between gap-2 border border-dashed p-3 text-sm">
                <div>
                  <p className="font-medium">{appliedCoupon.code} applied</p>
                  <p className="text-xs text-mute-text">
                    You saved {formatINR(discount)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="text-xs uppercase tracking-widest text-mute-text hover:text-foreground"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <Label htmlFor="coupon" className="eyebrow text-mute-text">
                  Coupon code
                </Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="coupon"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value);
                      if (couponError) setCouponError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void applyCoupon();
                      }
                    }}
                    placeholder="SAVE20"
                    autoCapitalize="characters"
                    autoComplete="off"
                    className="uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={applyCoupon}
                    loading={couponLoading}
                    disabled={!couponInput.trim()}
                  >
                    Apply
                  </Button>
                </div>
                {couponError && (
                  <p className="mt-1 text-xs text-destructive">{couponError}</p>
                )}
              </>
            )}
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{shippingCost === 0 ? "Free" : formatINR(shippingCost)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Discount{appliedCoupon ? ` (${appliedCoupon.code})` : ""}</span>
                <span>−{formatINR(discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-medium">
              <span>Total</span><span>{formatINR(total)}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

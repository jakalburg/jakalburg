import { useState } from "react";
import { useRouter } from "next/router";
import { z } from "zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { selectCartItems, selectCartSubtotal, clear_cart } from "@/redux/features/cart-slice";
import { add_order } from "@/redux/features/orders-slice";
import { selectProfile, add_address, update_profile, type Profile } from "@/redux/features/addresses-slice";
import { selectAuthUser } from "@/redux/features/auth-slice";
import { generateOrderId, formatINR } from "@/lib/format";
import type { Address, MockOrder } from "@/types";
import { DemoBanner } from "@/components/common/DemoBanner";

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

export function CheckoutFlow() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const items = useAppSelector(selectCartItems);
  const subtotal = useAppSelector(selectCartSubtotal);
  const profile = useAppSelector(selectProfile);
  const user = useAppSelector(selectAuthUser);
  const clearCart = () => dispatch(clear_cart());
  const addOrder = (o: MockOrder) => dispatch(add_order(o));
  const addAddress = (a: Address) => dispatch(add_address(a));
  const updateProfile = (patch: Partial<Profile>) => dispatch(update_profile(patch));

  const [step, setStep] = useState<Step>("contact");
  const [contact, setContact] = useState<ContactForm>({ email: user?.email ?? profile.email ?? "" });
  const [address, setAddress] = useState<AddressForm | null>(null);
  const [shipping, setShipping] = useState<Shipping>("standard");
  const [payMethod, setPayMethod] = useState<PayMethod>("card");

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
  const total = subtotal + shippingCost;

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
  const onAddress: SubmitHandler<AddressForm> = (data) => {
    setAddress(data);
    setStep("shipping");
  };

  const placeOrder = () => {
    if (!address) return;
    const addressRecord: Address = { id: `addr-${Date.now()}`, ...address };
    addAddress(addressRecord);
    const order: MockOrder = {
      id: generateOrderId(),
      createdAt: new Date().toISOString(),
      items,
      subtotal,
      shipping: shippingCost,
      discount: 0,
      total,
      status: "processing",
      address: addressRecord,
      email: contact.email,
      paymentLabel: paymentLabel(),
    };
    addOrder(order);
    // Clear all payment inputs so nothing lingers in memory beyond the label.
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setUpi("");
    clearCart();
    void router.push(`/order-confirmation/${order.id}`);
  };

  const stepOrder: Step[] = ["contact", "address", "shipping", "payment", "review"];
  const stepIdx = stepOrder.indexOf(step);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div>
        <DemoBanner />
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
          <form onSubmit={addressForm.handleSubmit(onAddress)} className="max-w-xl space-y-4">
            <h2 className="text-xl">Shipping address</h2>
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
              <Button variant="outline" type="button" onClick={() => setStep("contact")}>Back</Button>
              <Button type="submit">Continue to shipping</Button>
            </div>
          </form>
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
              <Button onClick={() => setStep("review")}>Review order</Button>
            </div>
          </div>
        )}

        {step === "review" && address && (
          <div className="max-w-xl space-y-6">
            <h2 className="text-xl">Review</h2>
            <div className="grid gap-4 border p-4 text-sm">
              <div>
                <p className="eyebrow text-mute-text">Contact</p>
                <p>{contact.email}</p>
              </div>
              <Separator />
              <div>
                <p className="eyebrow text-mute-text">Ship to</p>
                <p>{address.fullName}</p>
                <p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
                <p>{address.city}, {address.state} {address.pincode}</p>
                <p>{address.phone}</p>
              </div>
              <Separator />
              <div>
                <p className="eyebrow text-mute-text">Shipping</p>
                <p>{shippingRates[shipping].label} · {shippingRates[shipping].eta}</p>
              </div>
              <Separator />
              <div>
                <p className="eyebrow text-mute-text">Payment</p>
                <p>{paymentLabel()}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("payment")}>Back</Button>
              <Button onClick={placeOrder} disabled={items.length === 0}>Place demo order</Button>
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
                <img src={i.image} alt="" aria-hidden="true" className="h-16 w-14 object-cover" />
                <div className="flex-1">
                  <p className="font-medium">{i.title}</p>
                  <p className="text-xs text-mute-text">{i.color} · {i.size} · Qty {i.quantity}</p>
                </div>
                <p>{formatINR(i.price * i.quantity)}</p>
              </li>
            ))}
          </ul>
          <Separator className="my-4" />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{shippingCost === 0 ? "Free" : formatINR(shippingCost)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-medium">
              <span>Total</span><span>{formatINR(total)}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

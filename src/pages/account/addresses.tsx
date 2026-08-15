import { useState } from "react";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { AccountShell } from "@/components/account/AccountShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { selectAddresses, add_address, remove_address, set_default_address } from "@/redux/features/addresses-slice";
import { useHydrated } from "@/hooks/useHydrated";
import type { Address } from "@/types";

const empty = { fullName: "", line1: "", city: "", state: "", pincode: "", phone: "" };

export default function AddressesPage() {
  const dispatch = useAppDispatch();
  const hydrated = useHydrated();
  const addresses = useAppSelector(selectAddresses);
  const addAddress = (a: Address) => dispatch(add_address(a));
  const removeAddress = (id: string) => dispatch(remove_address(id));
  const setDefault = (id: string) => dispatch(set_default_address(id));

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const a: Address = { id: `addr-${Date.now()}`, ...form, isDefault: addresses.length === 0 };
    addAddress(a);
    setForm(empty);
    setOpen(false);
  };

  return (
    <>
      <SEO title="Addresses — Jakalburg" noIndex />
      <SiteLayout hideNewsletter>
        <AccountShell>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl">Addresses</h2>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild><Button size="sm">Add address</Button></SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader><SheetTitle>New address</SheetTitle></SheetHeader>
                <form onSubmit={save} className="mt-6 space-y-3">
                  {(["fullName", "line1", "city", "state", "pincode", "phone"] as const).map((k) => (
                    <div key={k}>
                      <Label htmlFor={k}>{k === "line1" ? "Address" : k === "pincode" ? "PIN" : k}</Label>
                      <Input
                        id={k}
                        required
                        value={form[k]}
                        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                      />
                    </div>
                  ))}
                  <Button type="submit" className="w-full">Save address</Button>
                </form>
              </SheetContent>
            </Sheet>
          </div>

          {!hydrated ? null : addresses.length === 0 ? (
            <p className="text-sm text-mute-text">You haven&apos;t saved any addresses yet.</p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {addresses.map((a) => (
                <li key={a.id} className="border p-4 text-sm">
                  <div className="flex items-start justify-between">
                    <p className="font-medium">{a.fullName}</p>
                    {a.isDefault && <span className="border px-2 py-0.5 text-[10px] uppercase tracking-widest">Default</span>}
                  </div>
                  <p className="mt-2">{a.line1}</p>
                  <p>{a.city}, {a.state} {a.pincode}</p>
                  <p className="mt-1 text-mute-text">{a.phone}</p>
                  <div className="mt-4 flex gap-2">
                    {!a.isDefault && <Button size="sm" variant="outline" onClick={() => setDefault(a.id)}>Set default</Button>}
                    <Button size="sm" variant="ghost" onClick={() => removeAddress(a.id)}>Remove</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AccountShell>
      </SiteLayout>
    </>
  );
}

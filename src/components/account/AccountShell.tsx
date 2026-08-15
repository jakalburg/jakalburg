import Link from "next/link";
import { useRouter } from "next/router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { selectAuthUser, sign_out } from "@/redux/features/auth-slice";
import { useHydrated } from "@/hooks/useHydrated";

const links = [
  { to: "/account", label: "Overview" },
  { to: "/account/orders", label: "Orders" },
  { to: "/account/addresses", label: "Addresses" },
  { to: "/account/profile", label: "Profile" },
] as const;

export function AccountShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = router.pathname;
  const hydrated = useHydrated();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const signOut = () => dispatch(sign_out());

  return (
    <section className="container-vh py-12">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="eyebrow text-mute-text">Account</p>
          <h1 className="mt-2 text-3xl">
            {hydrated && user ? `Hello, ${user.name.split(" ")[0]}` : "My account"}
          </h1>
        </div>
        {hydrated && user && (
          <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
        )}
      </div>
      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Account">
          <ul className="space-y-1 text-sm">
            {links.map((l) => (
              <li key={l.to}>
                <Link
                  href={l.to}
                  className={cn(
                    "block border-l-2 border-transparent px-3 py-2 hover:bg-stone",
                    pathname === l.to && "border-foreground bg-stone font-medium",
                  )}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>{children}</div>
      </div>
    </section>
  );
}

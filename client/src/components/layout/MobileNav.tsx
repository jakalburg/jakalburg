import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Mail,
  Phone,
  Search,
  ShoppingBag,
  User,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  setMobileNavOpen,
  setCartOpen,
  selectUI,
} from "@/redux/features/ui-slice";
import { selectCartCount } from "@/redux/features/cart-slice";
import { selectWishlistIds } from "@/redux/features/wishlist-slice";
import { selectIsAuthenticated } from "@/redux/features/auth-slice";
import { useHydrated } from "@/hooks/useHydrated";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useCollections } from "@/hooks/useCollections";
import { useNavCategories, type NavGender } from "@/hooks/useNavCategories";
import { usePublishedPages } from "@/hooks/usePublishedPages";
import { SOCIAL_META } from "./social-meta";
import { cn } from "@/lib/utils";

/** Which second-level panel is showing, if any. */
type Panel = "women" | "men" | "collections";

const PANEL_TITLES: Record<Panel, string> = {
  women: "Women",
  men: "Men",
  collections: "Collections",
};

/**
 * The storefront's mobile navigation.
 *
 * Drill-down rather than accordion: the top level stays one short, scannable
 * screen however many categories the catalogue grows to, and each panel gets
 * the full height instead of pushing everything below it off-screen.
 *
 * Everything in here is live. Categories come from the products that are
 * actually active for that gender, collections from the admin's collection
 * list, and the help links only from pages an admin has published — so there
 * is nothing here that can lead to an empty or missing page.
 */
export function MobileNav() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const hydrated = useHydrated();
  const open = useAppSelector(selectUI).mobileNavOpen;

  const [panel, setPanel] = useState<Panel | null>(null);
  const [query, setQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const setOpen = (v: boolean) => dispatch(setMobileNavOpen(v));
  const close = () => setOpen(false);

  const { storeName, logo, email, phone, socials } = useSiteSettings();
  const { data: collections } = useCollections();
  const women = useNavCategories("women");
  const men = useNavCategories("men");
  const { pages } = usePublishedPages();

  const cartCount = useAppSelector(selectCartCount);
  const wishlistCount = useAppSelector(selectWishlistIds).length;
  const signedIn = useAppSelector(selectIsAuthenticated);

  // Always reopen at the top level — returning to a drawer still sitting in
  // "Men" from a previous visit is disorienting.
  useEffect(() => {
    if (!open) {
      setPanel(null);
      setQuery("");
    }
  }, [open]);

  // A panel change is a new screen, so it should start at the top rather than
  // inherit the scroll position of the one before it.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [panel]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    close();
    void router.push({ pathname: "/search", query: { q: term } });
  };

  const openCart = () => {
    close();
    dispatch(setCartOpen(true));
  };

  const categoriesFor = (gender: NavGender) =>
    gender === "women" ? women.categories : men.categories;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="flex w-full flex-col p-0 sm:max-w-sm">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle asChild>
            <Link href="/" onClick={close} aria-label={`${storeName} home`}>
              <img
                src={logo}
                alt={storeName}
                className="h-9 w-auto object-contain mix-blend-multiply"
              />
            </Link>
          </SheetTitle>
          <SheetDescription className="sr-only">
            Site navigation
          </SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
          {panel ? (
            <SubPanel
              title={PANEL_TITLES[panel]}
              onBack={() => setPanel(null)}
              allHref={panel === "collections" ? "/collections" : `/${panel}`}
              allLabel={
                panel === "collections"
                  ? "All collections"
                  : `Shop all ${panel}`
              }
              onNavigate={close}
              items={
                panel === "collections"
                  ? (collections ?? []).map((c) => ({
                      href: `/collections/${c.slug}`,
                      label: c.title,
                    }))
                  : categoriesFor(panel).map((c) => ({
                      href: `/category/${c.slug}`,
                      label: c.title,
                    }))
              }
            />
          ) : (
            <div className="pb-8">
              {/* Search first: it's the fastest route to a specific product,
                  and it replaces the icon removed from the mobile header. */}
              <form onSubmit={submitSearch} className="px-5 pt-5">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mute-text"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search products"
                    aria-label="Search products"
                    className="h-11 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </form>

              <nav className="mt-4" aria-label="Shop">
                <DrillRow label="Women" onClick={() => setPanel("women")} />
                <DrillRow label="Men" onClick={() => setPanel("men")} />
                <DrillRow
                  label="Collections"
                  onClick={() => setPanel("collections")}
                />
              </nav>

              <Divider />
              <nav aria-label="Featured">
                <NavRow href="/new-arrivals" onNavigate={close}>
                  New arrivals
                </NavRow>
                <NavRow href="/essentials" onNavigate={close}>
                  Essentials
                </NavRow>
                <NavRow href="/sale" onNavigate={close}>
                  Sale
                </NavRow>
              </nav>

              <Divider />
              <nav aria-label="Your account">
                {/* Gated on hydration: rendering the signed-in version from a
                    server render the browser then contradicts would flash the
                    wrong links on every load. */}
                {hydrated && signedIn ? (
                  <>
                    <NavRow href="/account" onNavigate={close} icon={User}>
                      My account
                    </NavRow>
                    <NavRow href="/account/orders" onNavigate={close}>
                      Orders
                    </NavRow>
                    <NavRow href="/account/addresses" onNavigate={close}>
                      Addresses
                    </NavRow>
                  </>
                ) : (
                  <>
                    <NavRow href="/login" onNavigate={close} icon={User}>
                      Sign in
                    </NavRow>
                    <NavRow href="/signup" onNavigate={close}>
                      Create an account
                    </NavRow>
                  </>
                )}
                <NavRow
                  href="/wishlist"
                  onNavigate={close}
                  icon={Heart}
                  badge={hydrated ? wishlistCount : 0}
                >
                  Wishlist
                </NavRow>
                <ActionRow
                  onClick={openCart}
                  icon={ShoppingBag}
                  badge={hydrated ? cartCount : 0}
                >
                  Cart
                </ActionRow>
              </nav>

              {/* Only pages an admin has actually published. An empty list
                  means the API is unreachable or everything is unpublished —
                  either way, better to show nothing than a dead link. */}
              {pages.length > 0 && (
                <>
                  <Divider />
                  <p className="px-5 pb-1 pt-1 text-[11px] uppercase tracking-[0.14em] text-mute-text">
                    Help
                  </p>
                  <nav aria-label="Help">
                    <NavRow href="/contact" onNavigate={close}>
                      Contact
                    </NavRow>
                    {pages.map((page) => (
                      <NavRow
                        key={page.slug}
                        href={`/${page.slug}`}
                        onNavigate={close}
                      >
                        {page.title}
                      </NavRow>
                    ))}
                  </nav>
                </>
              )}

              {(email || phone || socials.length > 0) && (
                <>
                  <Divider />
                  <div className="space-y-3 px-5 pt-2">
                    {phone && (
                      <a
                        href={`tel:${phone.replace(/\s+/g, "")}`}
                        className="flex items-center gap-2.5 text-sm text-mute-text"
                      >
                        <Phone className="size-4" aria-hidden="true" />
                        {phone}
                      </a>
                    )}
                    {email && (
                      <a
                        href={`mailto:${email}`}
                        className="flex items-center gap-2.5 text-sm text-mute-text"
                      >
                        <Mail className="size-4" aria-hidden="true" />
                        {email}
                      </a>
                    )}
                    {socials.length > 0 && (
                      <ul className="flex items-center gap-5 pt-1">
                        {socials.map(({ key, url }) => {
                          const { Icon, label } = SOCIAL_META[key];
                          return (
                            <li key={key}>
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer noopener"
                                aria-label={`${storeName} on ${label}`}
                                className="text-mute-text transition-colors hover:text-foreground"
                              >
                                <Icon className="size-5" aria-hidden="true" />
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Second level: a back affordance, a "shop all" escape hatch, then the list. */
function SubPanel({
  title,
  onBack,
  allHref,
  allLabel,
  items,
  onNavigate,
}: {
  title: string;
  onBack: () => void;
  allHref: string;
  allLabel: string;
  items: { href: string; label: string }[];
  onNavigate: () => void;
}) {
  return (
    <div className="pb-8">
      <button
        type="button"
        onClick={onBack}
        className="flex w-full items-center gap-2 px-5 py-4 text-left text-sm font-medium"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        {title}
      </button>
      <Divider />
      <NavRow href={allHref} onNavigate={onNavigate}>
        {allLabel}
      </NavRow>
      <Divider />
      {items.map((item) => (
        <NavRow key={item.href} href={item.href} onNavigate={onNavigate}>
          {item.label}
        </NavRow>
      ))}
    </div>
  );
}

/** A row that opens a sub-panel. */
function DrillRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between px-5 py-3.5 text-left text-[15px] transition-colors hover:bg-muted/60"
    >
      {label}
      <ChevronRight className="size-4 text-mute-text" aria-hidden="true" />
    </button>
  );
}

type RowIcon = typeof User;

/** A row that navigates. 44px minimum height — a comfortable phone target. */
function NavRow({
  href,
  children,
  onNavigate,
  icon: Icon,
  badge,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
  icon?: RowIcon;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex min-h-11 items-center gap-2.5 px-5 py-3 text-[15px] transition-colors hover:bg-muted/60"
    >
      {Icon && <Icon className="size-4 text-mute-text" aria-hidden="true" />}
      {children}
      <Badge value={badge} />
    </Link>
  );
}

/** Same shape as NavRow, but for something that isn't a navigation. */
function ActionRow({
  children,
  onClick,
  icon: Icon,
  badge,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: RowIcon;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center gap-2.5 px-5 py-3 text-left text-[15px] transition-colors hover:bg-muted/60"
    >
      {Icon && <Icon className="size-4 text-mute-text" aria-hidden="true" />}
      {children}
      <Badge value={badge} />
    </button>
  );
}

function Badge({ value }: { value?: number }) {
  if (!value) return null;
  return (
    <span
      className={cn(
        "ml-1 min-w-5 rounded-full bg-ink px-1.5 text-center text-[11px] leading-5",
        "text-primary-foreground",
      )}
      aria-hidden="true"
    >
      {value}
    </span>
  );
}

function Divider() {
  return <div className="my-2 border-t" />;
}

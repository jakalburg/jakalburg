import Link from "next/link";
import { Search, User, Heart, ShoppingBag, Menu } from "lucide-react";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setSearchOpen, setCartOpen, setMobileNavOpen } from "@/redux/features/ui-slice";
import { selectCartCount } from "@/redux/features/cart-slice";
import { useHydrated } from "@/hooks/useHydrated";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { MegaMenu } from "./MegaMenu";

export function Header() {
  const dispatch = useAppDispatch();
  const hydrated = useHydrated();
  const count = useAppSelector(selectCartCount);
  const { storeName, logo } = useSiteSettings();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container-vh flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open menu"
            onClick={() => dispatch(setMobileNavOpen(true))}
          >
            <Menu className="size-5" aria-hidden="true" />
          </Button>
          <nav className="hidden lg:block">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Women</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[720px]"><MegaMenu section="women" /></div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Men</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[720px]"><MegaMenu section="men" /></div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </nav>
          <div className="hidden items-center gap-6 pl-4 text-sm lg:flex">
            <Link href="/new-arrivals" className="hover:underline underline-offset-4">New</Link>
            <Link href="/collections" className="hover:underline underline-offset-4">Collections</Link>
            <Link href="/essentials" className="hover:underline underline-offset-4">Essentials</Link>
            <Link href="/sale" className="hover:underline underline-offset-4">Sale</Link>
          </div>
        </div>

        <Link href="/" className="flex items-center" aria-label={`${storeName} home`}>
          {/* Smaller on phones: at 64px the logo crowded the icon row off the
              edge of a 375px screen. Desktop keeps the original size. */}
          <img src={logo} alt={storeName} className="h-10 w-auto mix-blend-multiply lg:h-16" />
        </Link>


        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Search" onClick={() => dispatch(setSearchOpen(true))}>
            <Search className="size-5" aria-hidden="true" />
          </Button>
          {/* Account and wishlist live in the drawer on phones — four targets
              in this row is already tight at 375px, and both are one tap away
              under the menu button. */}
          <Button variant="ghost" size="icon" aria-label="Account" asChild className="hidden lg:inline-flex">
            <Link href="/account"><User className="size-5" aria-hidden="true" /></Link>
          </Button>
          <Button variant="ghost" size="icon" aria-label="Wishlist" asChild className="hidden lg:inline-flex">
            <Link href="/wishlist"><Heart className="size-5" aria-hidden="true" /></Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Cart, ${hydrated ? count : 0} items`}
            onClick={() => dispatch(setCartOpen(true))}
            className="relative"
          >
            <ShoppingBag className="size-5" aria-hidden="true" />
            {hydrated && count > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-ink px-1 text-[10px] leading-4 text-primary-foreground"
                aria-hidden="true"
              >
                {count}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}

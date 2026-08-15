import type { ReactNode } from "react";
import { AnnouncementBar } from "./AnnouncementBar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Newsletter } from "./Newsletter";
import { MobileNav } from "./MobileNav";
import { SearchOverlay } from "./SearchOverlay";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Toaster } from "@/components/ui/sonner";

export function SiteLayout({ children, hideNewsletter }: { children: ReactNode; hideNewsletter?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Header />
      <main className="flex-1">{children}</main>
      {!hideNewsletter && <Newsletter />}
      <Footer />
      <MobileNav />
      <SearchOverlay />
      <CartDrawer />
      <Toaster position="bottom-right" />
    </div>
  );
}

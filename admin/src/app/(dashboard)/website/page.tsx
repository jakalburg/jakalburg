"use client";

import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { HeaderTab } from "@/components/website/header-tab";
import { HomeSetupTab } from "@/components/website/home-setup-tab";
import { PagesTab } from "@/components/website/pages-tab";
import { Suspense } from "react";

function WebsiteContent() {
  const pathname = usePathname();

  // Determine which content to show based on the pathname
  const isHeaderPage = pathname === "/website" || pathname.includes("/header");
  const isHomePage = pathname.includes("/home");
  const isPagesPage = pathname.includes("/pages");

  // Default to header if on base /website path
  const showHeader = isHeaderPage && !isHomePage && !isPagesPage;
  const showHome = isHomePage;
  const showPages = isPagesPage;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Website Customization
        </h1>
        <p className="text-muted-foreground">
          Manage your store's appearance, navigation, and static content.
        </p>
      </div>

      {/* Content based on route */}
      <div className="mt-6">
        {showHeader && <HeaderTab />}
        {showHome && <HomeSetupTab />}
        {showPages && <PagesTab />}
      </div>
    </div>
  );
}

export default function WebsitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <WebsiteContent />
    </Suspense>
  );
}

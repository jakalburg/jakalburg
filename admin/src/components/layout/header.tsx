"use client";

import { User, Moon, Sun, Menu, ChevronRight } from "lucide-react";
import { GlobalSearch } from "./global-search";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTheme } from "next-themes";
import { signOut, useSession } from "@/lib/mock-auth";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { NotificationBell } from "./notification-bell";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-config";

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(() =>
    navItems
      .filter(
        (item) =>
          item.subItems &&
          ((item.href !== "/" && pathname.startsWith(item.href)) ||
            item.subItems.some((subItem) => pathname.startsWith(subItem.href))),
      )
      .map((item) => item.href),
  );

  useEffect(() => {
    const activeParents = navItems
      .filter(
        (item) =>
          item.subItems &&
          ((item.href !== "/" && pathname.startsWith(item.href)) ||
            item.subItems.some((subItem) => pathname.startsWith(subItem.href))),
      )
      .map((item) => item.href);

    if (activeParents.length) {
      setExpandedItems((prev) => Array.from(new Set([...prev, ...activeParents])));
    }
  }, [pathname]);

  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href],
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetTitle className="sr-only">Mobile Navigation</SheetTitle>
        <div className="flex flex-col h-full bg-sidebar">
          <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2"
              aria-label="Jakalburg admin home"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white p-1 ring-1 ring-black/5">
                <Image
                  src="/mini_logo.png"
                  alt="Jakalburg"
                  width={32}
                  height={32}
                  className="h-full w-full object-contain"
                />
              </span>
              <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
                Jakalburg
              </span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-4">
            <nav className="space-y-1 px-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  (item.href !== "/" && pathname.startsWith(item.href)) ||
                  (item.href === "/" && pathname === "/");

                const isExpanded = expandedItems.includes(item.href);

                return (
                  <div key={item.href} className="flex flex-col gap-1">
                    <div
                      onClick={() => {
                        if (item.subItems) {
                          toggleExpanded(item.href);
                        } else {
                          setOpen(false);
                        }
                      }}
                      className="w-full"
                    >
                      <Link
                        href={item.href}
                        onClick={(e) => {
                          if (item.subItems) {
                            e.preventDefault();
                          } else {
                            setOpen(false);
                          }
                        }}
                        className={cn(
                          "flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors group",
                          isActive && !item.subItems
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "",
                          item.subItems && isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : item.subItems
                              ? "text-sidebar-foreground hover:bg-sidebar-accent"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 shrink-0" />
                          <span className="min-w-0 truncate">{item.label}</span>
                        </div>

                        {/* Chevron for sub items */}
                        {item.subItems && (
                          <ChevronRight
                            className={cn(
                              "w-4 h-4 transition-transform text-muted-foreground group-hover:text-foreground",
                              isExpanded && "rotate-90",
                            )}
                          />
                        )}
                      </Link>
                    </div>

                    {/* Render Sub Items */}
                    {item.subItems && isExpanded && (
                      <div className="flex flex-col gap-1 ml-6 pl-2 border-l border-sidebar-border mt-1">
                        {item.subItems.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubItemActive =
                            pathname === subItem.href ||
                            pathname.startsWith(subItem.href);

                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              onClick={() => setOpen(false)}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                                isSubItemActive
                                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                              )}
                            >
                              <SubIcon className="w-4 h-4 shrink-0" />
                              <span className="min-w-0 truncate">
                                {subItem.label}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  // The signed-in admin's display name comes from the auth session. (It used to
  // come from a /profiles/me endpoint that this backend never had.)
  const { firstName, lastName, name } = session.user;
  const adminName =
    firstName && lastName ? `${firstName} ${lastName}` : firstName || name || "Admin";

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-full items-center justify-between px-4 md:px-6 gap-4">
        <MobileNav />
        {/* Search */}
        <div className="flex-1 max-w-md hidden sm:block">
          <GlobalSearch />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>
          )}

          {/* Notifications */}
          <NotificationBell />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <div className="w-8 h-8 rounded-full bg-gradient-accent flex items-center justify-center">
                  <User className="w-4 h-4 text-accent-foreground" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{adminName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={() => {
                  Cookies.remove("admin_access_token");
                  signOut({ callbackUrl: "/login", redirect: true });
                }}
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

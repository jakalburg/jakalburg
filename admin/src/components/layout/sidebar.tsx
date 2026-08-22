"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { navItems } from "./nav-config";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center justify-between gap-2 px-3 border-b border-sidebar-border">
        {!collapsed && (
          <Link
            href="/"
            className="flex items-center gap-2 overflow-hidden"
            aria-label="Jakalburg admin home"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white p-1 ring-1 ring-black/5">
              <Image
                src="/mini_logo.png"
                alt="Jakalburg"
                width={32}
                height={32}
                className="h-full w-full object-contain"
                priority
              />
            </span>
            <span className="truncate text-base font-semibold tracking-tight text-sidebar-foreground">
              Jakalburg
            </span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(collapsed ? "mx-auto" : "ml-auto")}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            (item.href !== "/" && pathname.startsWith(item.href)) ||
            (item.href === "/" && pathname === "/");

          const hasExpandedState = isActive;
          const [isExpanded, setIsExpanded] = useState(hasExpandedState);

          const handleItemClick = (
            e: React.MouseEvent,
            hasChildren: boolean,
          ) => {
            if (hasChildren && !collapsed) {
              e.preventDefault();
              setIsExpanded(!isExpanded);
            }
          };

          return (
            <div key={item.href} className="flex flex-col gap-1">
              <Link
                href={item.href}
                onClick={(e) => handleItemClick(e, !!item.subItems)}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors group",
                  !item.subItems &&
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive && !item.subItems
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "",
                  item.subItems && isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : item.subItems
                      ? "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      : "",
                )}
              >
                <div className="flex items-center gap-3 relative">
                  <Icon className={cn("w-5 h-5", collapsed ? "mx-auto" : "")} />
                  {!collapsed && <span>{item.label}</span>}
                </div>

                {/* Chevron for sub items */}
                {!collapsed && item.subItems && (
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 transition-transform text-muted-foreground group-hover:text-sidebar-accent-foreground",
                      isExpanded && "rotate-90",
                    )}
                  />
                )}
              </Link>

              {/* Render Sub Items */}
              {!collapsed && item.subItems && isExpanded && (
                <div className="flex flex-col gap-1 ml-6 pl-2 border-l border-sidebar-border mt-1 relative">
                  {item.subItems.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const isSubItemActive =
                      pathname === subItem.href ||
                      pathname.startsWith(subItem.href);

                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                          isSubItemActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <SubIcon className="w-4 h-4" />
                        <span>{subItem.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="mt-auto p-4 border-t border-sidebar-border">
          <div className="text-xs text-muted-foreground text-center">
            v1.0.0
          </div>
        </div>
      )}
    </aside>
  );
}

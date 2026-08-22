"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SettingsPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="settings-page flex-1 space-y-4 px-0 pb-24 pt-0 sm:px-2 md:p-2 md:pb-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground md:text-base">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

export function SettingsActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <>
      <div className={cn("hidden gap-2 md:flex md:items-center", className)}>
        {children}
      </div>
      <div className="settings-mobile-actions">
        <div className={cn("flex w-full flex-col gap-2 md:flex-row", className)}>
          {children}
        </div>
      </div>
    </>
  );
}

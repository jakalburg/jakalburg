"use client";

import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  // We cannot easily pass collapsed state without context or lifting state,
  // but let's assume it's pl-64 by default on md+. The simplest responsive fix:
  return (
    <div className="min-h-screen bg-pattern">
      <Sidebar />
      <div className="pl-0 md:pl-64 transition-all duration-300">
        <Header />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { CustomersTab } from "@/components/users/customers-tab";
import { StaffTab } from "@/components/users/staff-tab";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

function UsersContent() {
  const pathname = usePathname();

  // Determine which content to show based on the pathname
  const isCustomersPage =
    pathname === "/users" || pathname.includes("/customers");
  const isStaffPage = pathname.includes("/staff");

  // Default to customers if on base /users path
  const showCustomers = isCustomersPage && !isStaffPage;
  const showStaff = isStaffPage;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage your customers and administrative staff in one place
        </p>
      </div>

      {/* Content based on route */}
      <div className="mt-6">
        {showCustomers && <CustomersTab />}
        {showStaff && <StaffTab />}
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <UsersContent />
    </Suspense>
  );
}

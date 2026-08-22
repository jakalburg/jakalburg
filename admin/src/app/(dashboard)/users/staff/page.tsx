"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { StaffTab } from "@/components/users/staff-tab";

function StaffContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Staff</h1>
        <p className="text-muted-foreground mt-1">
          Manage administrative staff and permissions
        </p>
      </div>

      <StaffTab />
    </div>
  );
}

export default function UsersStaffPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <StaffContent />
    </Suspense>
  );
}

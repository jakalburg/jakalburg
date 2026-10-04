"use client";

import { SalesChart } from "@/components/dashboard/sales-chart";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { useRecentOrders } from "@/hooks/use-orders";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder tiles so the stats row holds its height instead of popping in. */
function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-32 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Home() {
  // Live figures from the backend — totals + 30-day deltas.
  const { data: stats, isPending: statsPending } = useDashboardStats();

  // Newest orders, straight off the admin orders endpoint.
  const { data: orders = [], isPending: ordersPending } = useRecentOrders(5);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here&apos;s what&apos;s happening with your store today.
        </p>
      </div>

      {/* Stats Cards */}
      {statsPending ? (
        <StatsCardsSkeleton />
      ) : stats ? (
        <StatsCards stats={stats} />
      ) : null}

      {/* Charts and Recent Activity */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-7">
        <SalesChart />
        <RecentOrders orders={orders} isLoading={ordersPending} />
      </div>
    </div>
  );
}

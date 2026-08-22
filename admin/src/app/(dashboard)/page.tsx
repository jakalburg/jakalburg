"use client";

import { SalesChart } from "@/components/dashboard/sales-chart";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { useRecentOrders } from "@/hooks/use-orders";
import { StatsCards } from "@/components/dashboard/stats-cards";

export default function Home() {
  // Fetch dashboard stats
  const { data: stats } = useDashboardStats();

  // Fetch recent orders
  const { data: orders = [] } = useRecentOrders(5);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here's what's happening with your store today.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && <StatsCards stats={stats} />}

      {/* Charts and Recent Activity */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-7">
        <SalesChart />
        <RecentOrders orders={orders} />
      </div>
    </div>
  );
}

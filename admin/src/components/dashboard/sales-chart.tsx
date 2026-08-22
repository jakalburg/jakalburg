"use client";

import { memo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { useAdminQuery } from "@/hooks/use-admin-query";
import useAxiosAuth from "@/hooks/use-axios-auth";

// Fetch sales chart data
const useSalesChart = () => {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(["dashboard-sales"], async () => {
    const { data } = await axiosAuth.get("/dashboard/sales");
    return data;
  });
};

export const SalesChart = memo(function SalesChart() {
  const { data: chartData = [], isLoading } = useSalesChart();

  if (isLoading) {
    return (
      <Card className="col-span-4 h-[430px] flex items-center justify-center">
        <div className="text-muted-foreground">Loading chart...</div>
      </Card>
    );
  }

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Revenue Overview</CardTitle>
        <CardDescription>Monthly revenue and order trends</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--primary)"
                  stopOpacity={0.3}
                />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis className="text-xs" stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--popover-foreground))",
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--primary)"
              fillOpacity={1}
              fill="url(#colorRevenue)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="orders"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#colorOrders)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

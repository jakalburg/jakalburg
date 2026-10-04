"use client";

import { memo, useState } from "react";
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
import { cn } from "@/lib/utils";
import { useSalesData } from "@/hooks/use-dashboard";
import type { SalesPeriod } from "@/services/dashboard.service";

// Real series from the backend: revenue (INR) and order counts per bucket,
// with empty buckets included as zeros so the line can't skip a quiet day.
const PERIODS: { value: SalesPeriod; label: string; caption: string }[] = [
  { value: "week", label: "7 days", caption: "Daily revenue and orders, last 7 days" },
  { value: "month", label: "30 days", caption: "Daily revenue and orders, last 30 days" },
  { value: "year", label: "12 months", caption: "Monthly revenue and orders, last 12 months" },
];

/** Compact rupees for the axis ticks — ₹1.2L / ₹12k / ₹480. */
const compactINR = (value: number) => {
  if (Math.abs(value) >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  if (Math.abs(value) >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  if (Math.abs(value) >= 1_000) return `₹${(value / 1_000).toFixed(1)}k`;
  return `₹${value}`;
};

export const SalesChart = memo(function SalesChart() {
  const [period, setPeriod] = useState<SalesPeriod>("month");
  const { data: chartData = [], isPending } = useSalesData(period);
  const active = PERIODS.find((p) => p.value === period) ?? PERIODS[1];

  // The server always returns a full set of buckets, so "no data" shows up as
  // an all-zero series rather than an empty array.
  const hasActivity = chartData.some((d) => d.revenue > 0 || d.orders > 0);

  return (
    <Card className="col-span-4">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>{active.caption}</CardDescription>
        </div>
        <div className="flex gap-1 shrink-0">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                p.value === period
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pl-2">
        {isPending ? (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            Loading chart...
          </div>
        ) : !hasActivity ? (
          <div className="h-[350px] flex items-center justify-center text-center text-muted-foreground px-6">
            No orders in the last {active.label.toLowerCase()} yet.
          </div>
        ) : (
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
                minTickGap={16}
              />
              {/* Two scales on purpose: a handful of orders and tens of
                  thousands of rupees share no useful axis — on one scale the
                  order line sits flat on the floor. */}
              <YAxis
                yAxisId="revenue"
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={compactINR}
                width={70}
              />
              <YAxis
                yAxisId="orders"
                orientation="right"
                className="text-xs"
                stroke="#10b981"
                allowDecimals={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--popover-foreground))",
                }}
                formatter={(value: number, name: string) =>
                  name === "revenue"
                    ? [`₹${Number(value).toLocaleString("en-IN")}`, "Revenue"]
                    : [value, "Orders"]
                }
              />
              <Area
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                stroke="var(--primary)"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                strokeWidth={2}
              />
              <Area
                yAxisId="orders"
                type="monotone"
                dataKey="orders"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorOrders)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
});

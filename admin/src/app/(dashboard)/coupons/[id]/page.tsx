"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Pencil,
  Tag as TagIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { couponsService } from "@/services";
import useAxiosAuth from "@/hooks/use-axios-auth";

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function CouponDetailPage() {
  const params = useParams();
  const couponId = params.id as string;
  const axiosAuth = useAxiosAuth();

  const { data: coupon, isLoading: couponLoading } = useQuery({
    queryKey: ["coupon", couponId],
    queryFn: () => couponsService(axiosAuth).getById(couponId),
  });

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ["coupon-usage", couponId],
    queryFn: () => couponsService(axiosAuth).getUsage(couponId),
  });

  if (couponLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!coupon) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h2 className="text-xl font-semibold">Coupon not found</h2>
        <Button variant="outline" asChild>
          <Link href="/coupons">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Coupons
          </Link>
        </Button>
      </div>
    );
  }

  const isExpired = coupon.endDate
    ? new Date(coupon.endDate) < new Date()
    : false;
  const status = isExpired ? "expired" : coupon.status;
  const discountLabel =
    coupon.discountType === "percentage"
      ? `${coupon.discountAmount}%`
      : `₹${coupon.discountAmount}`;
  const usage = usageData?.usage ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/coupons">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            {coupon.logo ? (
              <ImageShimmer
                src={coupon.logo}
                alt={coupon.couponCode}
                wrapperClassName="w-12 h-12 rounded-md border"
              />
            ) : null}
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-mono">
                {coupon.couponCode}
              </h1>
              <p className="text-muted-foreground mt-1">
                {coupon.title || "Coupon details"}
              </p>
            </div>
          </div>
        </div>
        <Button asChild className="gap-2">
          <Link href={`/coupons/${coupon.id}/edit`}>
            <Pencil className="w-4 h-4" />
            Edit
          </Link>
        </Button>
      </div>

      {/* Coupon details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TagIcon className="w-4 h-4" />
            Coupon Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
            <Detail label="Code">
              <span className="font-mono font-semibold">
                {coupon.couponCode}
              </span>
            </Detail>
            <Detail label="Title">{coupon.title || "—"}</Detail>
            <Detail label="Status">
              <Badge variant={status === "active" ? "default" : "secondary"}>
                {status}
              </Badge>
            </Detail>
            <Detail label="Discount">
              <Badge variant="secondary">{discountLabel}</Badge>
            </Detail>
            <Detail label="Minimum Amount">₹{coupon.minimumAmount}</Detail>
            <Detail label="Product Type">{coupon.productType || "all"}</Detail>
            <Detail label="Expiry">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {formatDate(coupon.endDate)}
              </span>
            </Detail>
            <Detail label="Usage">
              {coupon.usageCount ?? 0}
              {coupon.maxUsage ? ` / ${coupon.maxUsage}` : ""}
            </Detail>
            <Detail label="Created">{formatDate(coupon.createdAt)}</Detail>
          </div>
        </CardContent>
      </Card>

      {/* Usage history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage History</CardTitle>
        </CardHeader>
        <CardContent>
          {usageLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : usage.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No orders have used this coupon yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date Used</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="text-right">Order Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.map((row) => (
                  <TableRow key={row.orderId}>
                    <TableCell>
                      {row.user ? (
                        <Link
                          href={`/customers/${row.user.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {row.user.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Guest</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(row.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/orders/${row.orderId}`}
                        className="font-mono text-primary hover:underline"
                      >
                        {row.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">₹{row.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}

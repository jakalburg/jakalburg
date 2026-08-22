"use client";

import Link from "next/link";
import { Plus, Trash2, Calendar, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/admin/data-table";
import { useCoupons, useDeleteCoupon } from "@/hooks/use-coupons";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function CouponsPage() {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: coupons = [], isLoading, error } = useCoupons();
  const deleteMutation = useDeleteCoupon();

  const handleDelete = async (id: string) => {
    setDeletingId(id);

    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const columns = [
    {
      header: "Code",
      cell: (coupon: any) => (
        <div className="flex items-center gap-2">
          <TagIcon className="w-4 h-4 text-muted-foreground" />
          <span className="font-mono font-semibold">{coupon.couponCode}</span>
        </div>
      ),
    },
    {
      header: "Title",
      cell: (coupon: any) => <div className="font-medium">{coupon.title}</div>,
    },
    {
      header: "Discount",
      cell: (coupon: any) => (
        <div className="flex items-center gap-2">
          {coupon.discountType === "percentage" ? (
            <Badge variant="secondary">{coupon.discountAmount}%</Badge>
          ) : (
            <Badge variant="secondary">₹{coupon.discountAmount}</Badge>
          )}
        </div>
      ),
    },
    {
      header: "Min Amount",
      cell: (coupon: any) => (
        <span className="text-sm">₹{coupon.minimumAmount}</span>
      ),
    },
    {
      header: "End Date",
      cell: (coupon: any) => (
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          {formatDate(coupon.endDate)}
        </div>
      ),
    },
    {
      header: "Usage",
      cell: (coupon: any) => (
        <div className="text-sm">
          {coupon.usageCount || 0}
          {coupon.maxUsage && ` / ${coupon.maxUsage}`}
        </div>
      ),
    },
    {
      header: "Status",
      cell: (coupon: any) => {
        const isExpired = new Date(coupon.endDate) < new Date();
        const status = isExpired ? "expired" : coupon.status;

        return (
          <Badge variant={status === "active" ? "default" : "secondary"}>
            {status}
          </Badge>
        );
      },
    },
    {
      header: "Actions",
      className: "w-[150px]",
      cell: (coupon: any) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/coupons/${coupon.id}/edit`}>Edit</Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={deletingId === coupon.id}
              >
                {deletingId === coupon.id ? (
                  "Deleting..."
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the coupon "{coupon.couponCode}".
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(coupon.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
          <p className="text-muted-foreground mt-1">
            Manage discount coupons and promotional codes
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/coupons/create">
            <Plus className="w-4 h-4" />
            Create Coupon
          </Link>
        </Button>
      </div>

      {/* Coupons Table */}
      <DataTable
        title="All Coupons"
        data={coupons}
        columns={columns}
        isLoading={isLoading}
        error={error}
        emptyMessage="No coupons found"
        getRowKey={(coupon) => coupon.id}
      />
    </div>
  );
}

"use client";

import Link from "next/link";
import {
  Plus,
  Trash2,
  Calendar,
  Tag as TagIcon,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/admin/data-table";
import { useCoupons, useDeleteCoupon } from "@/hooks/use-coupons";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Copy a coupon code to the clipboard, with a brief check-mark confirmation. */
function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy the code");
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-6 w-6 text-muted-foreground hover:text-foreground"
      onClick={copy}
      title="Copy code"
      aria-label={`Copy coupon code ${code}`}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-600" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </Button>
  );
}
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
import {
  TablePagination,
  TABLE_PAGE_SIZE,
} from "@/components/admin/table-pagination";

export function CouponsTab() {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useCoupons({
    page,
    limit: TABLE_PAGE_SIZE,
  });
  const coupons = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
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
          <CopyCodeButton code={coupon.couponCode} />
        </div>
      ),
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Coupons</h2>
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

      {/* Desktop Table */}
      <div className="hidden md:block border rounded-lg overflow-x-auto">
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
      {!isLoading && !error && (
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          itemLabel="coupons"
        />
      )}

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading coupons...
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            Error loading coupons
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No coupons found
          </div>
        ) : (
          coupons.map((coupon: any) => {
            const isExpired = new Date(coupon.endDate) < new Date();
            const status = isExpired ? "expired" : coupon.status;

            return (
              <div
                key={coupon.id}
                className="border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors"
              >
                {/* Code and Discount */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <TagIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-mono font-semibold text-sm">
                      {coupon.couponCode}
                    </span>
                    <CopyCodeButton code={coupon.couponCode} />
                  </div>
                  <div className="flex items-center gap-2">
                    {coupon.discountType === "percentage" ? (
                      <Badge variant="secondary" className="text-xs">
                        {coupon.discountAmount}% OFF
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        ₹{coupon.discountAmount} OFF
                      </Badge>
                    )}
                    <Badge
                      variant={status === "active" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {status}
                    </Badge>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="space-y-2 mb-3 text-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground">Min Amount:</span>
                    <span className="font-medium">₹{coupon.minimumAmount}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground">End Date:</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span>{formatDate(coupon.endDate)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-xs"
                    asChild
                  >
                    <Link href={`/coupons/${coupon.id}/edit`}>Edit</Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-xs text-destructive hover:text-destructive/90"
                        disabled={deletingId === coupon.id}
                      >
                        {deletingId === coupon.id ? "Deleting..." : "Delete"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the coupon "
                          {coupon.couponCode}".
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
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

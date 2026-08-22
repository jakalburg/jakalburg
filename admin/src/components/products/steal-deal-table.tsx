"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Power,
  PowerOff,
} from "lucide-react";
import { Product } from "@/types/product";
import { useDeleteProduct } from "@/hooks/use-products";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { productsService } from "@/services/products.service";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StealDealTableProps {
  products: Product[];
  currentPage: number;
  totalPages: number;
  total: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onPageChange: (page: number) => void;
}

const visibilityColors = {
  active: "bg-green-500/10 text-green-600 border-green-500/20",
  disabled: "bg-red-500/10 text-red-600 border-red-500/20",
};

export function StealDealTable({
  products,
  currentPage,
  totalPages,
  total,
  searchQuery,
  onSearchChange,
  onPageChange,
}: StealDealTableProps) {
  const [statusChangeId, setStatusChangeId] = useState<string | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  const deleteProduct = useDeleteProduct();

  const allSelected =
    products.length > 0 && products.every((p) => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    const ids = Array.from(selectedIds);
    let successCount = 0;
    let failCount = 0;

    await Promise.allSettled(
      ids.map((id) =>
        productsService(axiosAuth)
          .delete(id)
          .then(() => successCount++)
          .catch(() => failCount++),
      ),
    );

    setIsBulkDeleting(false);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["products"] });

    if (successCount > 0)
      toast.success(`${successCount} Steal Deal${successCount > 1 ? "s" : ""} deleted`);
    if (failCount > 0)
      toast.error(`${failCount} failed to delete`);
  };

  const handleStatusChange = async (id: string, isActive: boolean) => {
    setIsChangingStatus(true);
    try {
      await productsService(axiosAuth).updateStatus(id, isActive);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      toast.success(isActive ? "Steal Deal enabled" : "Steal Deal disabled");
    } catch (error: any) {
      toast.error("Failed to update status", {
        description: error?.response?.data?.message || error?.message,
      });
    } finally {
      setIsChangingStatus(false);
      setStatusChangeId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search Steal Deals..."
          className="pl-9"
        />
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} selected
          </span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                disabled={isBulkDeleting}
              >
                <Trash2 className="w-4 h-4" />
                {isBulkDeleting ? "Deleting..." : `Delete ${selectedIds.size}`}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete {selectedIds.size} Steal Deal{selectedIds.size > 1 ? "s" : ""}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes the selected Steal Deals and their images. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Selected
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[48px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Steal Deal Price</TableHead>
              <TableHead>Original Total</TableHead>
              <TableHead>You Save</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No Steal Deal products found.
                </TableCell>
              </TableRow>
            )}
            {products.map((product) => {
              const isActive = product.isActive !== false;
              const thumbnail = product.thumbnail || product.img || "";
              const savings = product.stealDealSavings ?? 0;
              const isSelected = selectedIds.has(product.id);

              return (
                <TableRow
                  key={product.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/steal-deals/${product.id}/edit`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(product.id)}
                      aria-label={`Select ${product.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <ImageShimmer
                        src={thumbnail}
                        alt={product.name}
                        wrapperClassName="h-10 w-10 shrink-0 rounded-md border"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium max-w-[220px]">
                          {product.name}
                        </p>
                        {product.sku && (
                          <p className="text-xs text-muted-foreground">
                            {product.sku}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>₹{product.price?.toFixed(2)}</TableCell>
                  <TableCell>
                    {product.originalTotalPrice
                      ? `₹${product.originalTotalPrice.toFixed(2)}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {savings > 0 ? (
                      <span className="text-green-600 font-medium">
                        ₹{savings.toFixed(2)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        isActive ? visibilityColors.active : visibilityColors.disabled
                      }
                    >
                      {isActive ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/steal-deals/${product.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <AlertDialog
                          open={statusChangeId === product.id}
                          onOpenChange={(open) =>
                            setStatusChangeId(open ? product.id : null)
                          }
                        >
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                            >
                              {isActive ? (
                                <>
                                  <PowerOff className="mr-2 h-4 w-4" />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <Power className="mr-2 h-4 w-4" />
                                  Enable
                                </>
                              )}
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {isActive ? "Disable" : "Enable"} this Steal Deal?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {isActive
                                  ? "Customers will no longer see this Steal Deal on the storefront."
                                  : "This Steal Deal will become visible on the storefront again."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                disabled={isChangingStatus}
                                onClick={() =>
                                  handleStatusChange(product.id, !isActive)
                                }
                              >
                                {isChangingStatus && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Confirm
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete this Steal Deal?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently deletes &quot;{product.name}
                                &quot; and its images. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteProduct.mutate(product.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {products.length} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

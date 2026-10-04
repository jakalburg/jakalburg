"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Product } from "@/types/product";
import { useDeleteProduct } from "@/hooks/use-products";
import { Category } from "@/services/categories.service";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AddReviewDialog,
  type ReviewTargetProduct,
} from "@/components/catalog/add-review-dialog";
import {
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
  Eye,
  Search,
  ChevronRight,
  Check,
  Loader2,
  Power,
  PowerOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TablePagination } from "@/components/admin/table-pagination";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import useAxiosAuth from "@/hooks/use-axios-auth";
import {
  ProductSortOption,
  productsService,
} from "@/services/products.service";

interface ProductTableProps {
  products: Product[];
  /**
   * True while the rows for a newly requested page are still in flight. The
   * toolbar and pagination stay put — only the rows become placeholders, so the
   * page number you clicked is never captioning the previous page's products.
   */
  isPageLoading?: boolean;
  currentPage?: number;
  totalPages?: number;
  total?: number;
  searchQuery?: string;
  sortOption?: ProductSortOption;
  categoryFilter?: string;
  categories?: Category[];
  showDisabled?: boolean;
  /** Current list filters as a query string, appended to product links so
   * navigating to view/edit and back preserves the active filters. */
  returnQuery?: string;
  onSearchChange?: (query: string) => void;
  onSortChange?: (sort: ProductSortOption) => void;
  onCategoryChange?: (category: string) => void;
  onPageChange?: (page: number) => void;
  onShowDisabledChange?: (show: boolean) => void;
}

const sortOptions: { value: ProductSortOption; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
  { value: "price-asc", label: "Price low to high" },
  { value: "price-desc", label: "Price high to low" },
  { value: "stock-asc", label: "Stock low to high" },
  { value: "stock-desc", label: "Stock high to low" },
  { value: "popular", label: "Most viewed" },
];

const visibilityColors = {
  active: "bg-green-500/10 text-green-600 border-green-500/20",
  disabled: "bg-red-500/10 text-red-600 border-red-500/20",
};

export function ProductTable({
  products,
  isPageLoading = false,
  currentPage = 1,
  totalPages = 1,
  total = 0,
  searchQuery = "",
  sortOption = "newest",
  categoryFilter = "all",
  categories = [],
  showDisabled = false,
  returnQuery = "",
  onSearchChange,
  onSortChange,
  onCategoryChange,
  onPageChange,
  onShowDisabledChange,
}: ProductTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkStatusUpdating, setIsBulkStatusUpdating] = useState(false);
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);
  // The product whose row menu opened "Add review". Held here rather than one
  // dialog per row so only a single dialog is ever mounted.
  const [reviewTarget, setReviewTarget] = useState<ReviewTargetProduct | null>(
    null,
  );

  const deleteProduct = useDeleteProduct();
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();

  // Ensure products is an array
  const productsArray = Array.isArray(products) ? products : [];
  // The filter matches Product.category, which stores the slug — so offer
  // slugs, not display names. Categories are flat now (gender lives on the
  // product), so there is no subcategory level to flatten.
  const categoryOptions = categories
    .map((category) => category.slug)
    .filter((slug): slug is string => Boolean(slug))
    .filter((slug, index, list) => list.indexOf(slug) === index)
    .sort((a, b) => a.localeCompare(b));
  const selectedCategoryLabel =
    categoryFilter === "all" ? "All categories" : categoryFilter;

  const filteredProducts = productsArray;

  const withReturnQuery = (path: string) =>
    returnQuery ? `${path}?${returnQuery}` : path;

  // "Select all" means the rows currently on screen, so a selection must never
  // outlive the page it was made on — otherwise a bulk delete would silently
  // hit products the admin can no longer see.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage, searchQuery, sortOption, categoryFilter, showDisabled]);

  // Selection helpers
  const allSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
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

  // Bulk delete handler
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
      toast.success(
        `${successCount} product${successCount > 1 ? "s" : ""} deleted`,
      );
    if (failCount > 0)
      toast.error(
        `${failCount} product${failCount > 1 ? "s" : ""} failed to delete`,
      );
  };

  const handleSingleStatusChange = async (
    productId: string,
    isActive: boolean,
  ) => {
    if (statusPendingId) return;
    setStatusPendingId(productId);
    try {
      await productsService(axiosAuth).updateStatus(productId, isActive);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      toast.success(`Product ${isActive ? "enabled" : "disabled"} successfully`);
    } catch (error: any) {
      toast.error(`Failed to ${isActive ? "enable" : "disable"} product`, {
        description: error.response?.data?.message || error.message,
      });
    } finally {
      setStatusPendingId(null);
    }
  };

  const handleBulkStatusChange = async (isActive: boolean) => {
    if (isBulkStatusUpdating) return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setIsBulkStatusUpdating(true);
    try {
      const result = await productsService(axiosAuth).bulkUpdateStatus(
        ids,
        isActive,
      );
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(
        `${result.updated} product${result.updated === 1 ? "" : "s"} ${
          isActive ? "enabled" : "disabled"
        }`,
        {
          description: `${result.notFound} not found, ${
            isActive ? result.alreadyActive : result.alreadyDisabled
          } already ${isActive ? "active" : "disabled"}.`,
        },
      );
    } catch (error: any) {
      toast.error(`Failed to ${isActive ? "enable" : "disable"} products`, {
        description: error.response?.data?.message || error.message,
      });
    } finally {
      setIsBulkStatusUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search + Bulk Actions Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
        <div className="relative max-w-sm flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={sortOption}
          onValueChange={(value) => onSortChange?.(value as ProductSortOption)}
        >
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Sort products" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-[220px] justify-between"
            >
              <span className="truncate">{selectedCategoryLabel}</span>
              <ChevronRight className="w-4 h-4 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[220px]">
            <DropdownMenuItem onSelect={() => onCategoryChange?.("all")}>
              {categoryFilter === "all" && <Check className="w-4 h-4" />}
              All categories
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                Uploaded categories
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                {categoryOptions.length === 0 ? (
                  <DropdownMenuItem disabled>No categories</DropdownMenuItem>
                ) : (
                  categoryOptions.map((category) => (
                    <DropdownMenuItem
                      key={category}
                      onSelect={() => onCategoryChange?.(category)}
                    >
                      {categoryFilter === category && (
                        <Check className="w-4 h-4" />
                      )}
                      {category}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2 shrink-0">
          <Switch
            id="show-disabled"
            checked={showDisabled}
            onCheckedChange={(checked) => onShowDisabledChange?.(checked)}
          />
          <Label htmlFor="show-disabled" className="text-sm font-normal whitespace-nowrap">
            Show disabled products
          </Label>
        </div>

        {/* Bulk delete — only visible when items are selected */}
        {someSelected && (
          <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200 w-full sm:w-auto">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={isBulkStatusUpdating || isBulkDeleting}
                >
                  {isBulkStatusUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PowerOff className="w-4 h-4" />
                  )}
                  Disable Selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Disable {selectedIds.size} selected product
                    {selectedIds.size > 1 ? "s" : ""}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Disable this product? It will immediately disappear from
                    the customer website, but its existing order history will
                    remain unchanged.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isBulkStatusUpdating}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleBulkStatusChange(false)}
                    disabled={isBulkStatusUpdating}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Disable Selected
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={isBulkStatusUpdating || isBulkDeleting}
                >
                  {isBulkStatusUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Power className="w-4 h-4" />
                  )}
                  Enable Selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Enable {selectedIds.size} selected product
                    {selectedIds.size > 1 ? "s" : ""}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Enabled products can appear on the customer website again
                    anywhere public product listings include them.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isBulkStatusUpdating}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleBulkStatusChange(true)}
                    disabled={isBulkStatusUpdating}
                  >
                    Enable Selected
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  disabled={isBulkDeleting}
                >
                  <Trash2 className="w-4 h-4" />
                  {isBulkDeleting
                    ? "Deleting..."
                    : `Delete ${selectedIds.size}`}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete {selectedIds.size} product
                    {selectedIds.size > 1 ? "s" : ""}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete{" "}
                    <span className="font-medium text-foreground">
                      {selectedIds.size} product
                      {selectedIds.size > 1 ? "s" : ""}
                    </span>{" "}
                    and all their associated media.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete {selectedIds.size} product
                    {selectedIds.size > 1 ? "s" : ""}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="border rounded-lg overflow-x-auto hidden md:block">
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
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="hidden lg:table-cell">SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPageLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`loading-${i}`}>
                  <TableCell colSpan={9}>
                    <Skeleton className="h-9 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-8 text-muted-foreground"
                >
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const isSelected = selectedIds.has(product.id);
                // Use media array from backend, fallback to images if available
                const media = product.media || [];
                const primaryMedia =
                  media.find((m) => m.mediaType === "image") || media[0];
                const imageUrl =
                  product.thumbnail || product.img || primaryMedia?.publicUrl;

                const hasDiscount =
                  product.discountPrice &&
                  product.discountPrice <
                    (product.originalPrice || product.price);
                const productIsActive = product.isActive !== false;

                return (
                  <TableRow
                    key={product.id}
                    className={cn(
                      "group cursor-pointer hover:bg-muted/50",
                      isSelected && "bg-muted/40",
                      !productIsActive && "opacity-60",
                    )}
                    onClick={() =>
                      (window.location.href = withReturnQuery(`/products/${product.id}`))
                    }
                  >
                    {/* Checkbox */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(product.id)}
                        aria-label={`Select ${product.name}`}
                      />
                    </TableCell>

                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <ImageShimmer
                        src={imageUrl}
                        alt={product.name}
                        wrapperClassName="w-12 h-12 rounded-md"
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs font-mono text-muted-foreground lg:hidden">
                          {product.sku || "—"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs font-mono text-muted-foreground">
                        {product.sku || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {typeof product.category === "string"
                          ? product.category
                          : product.category?.name || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {hasDiscount ? (
                          <>
                            <span className="font-medium text-green-600">
                              ₹{product.discountPrice?.toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground line-through">
                              ₹
                              {(product.originalPrice || product.price).toFixed(
                                2,
                              )}
                            </span>
                          </>
                        ) : (
                          <span className="font-medium">
                            ₹
                            {(product.originalPrice || product.price).toFixed(
                              2,
                            )}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            (product.quantity || product.stockQuantity) === 0 &&
                              "text-red-500 font-medium",
                            (product.quantity || product.stockQuantity || 0) >
                              0 &&
                              (product.quantity || product.stockQuantity || 0) <
                                10 &&
                              "text-orange-500 font-medium",
                          )}
                        >
                          {product.quantity || product.stockQuantity || 0}
                        </span>
                        {(product.quantity || product.stockQuantity || 0) ===
                          0 && (
                          <Badge variant="destructive" className="text-xs">
                            Out of stock
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          productIsActive
                            ? visibilityColors.active
                            : visibilityColors.disabled,
                        )}
                      >
                        {productIsActive ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link
                              href={withReturnQuery(`/products/${product.id}`)}
                              className="cursor-pointer"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={withReturnQuery(`/products/${product.id}/edit`)}
                              className="cursor-pointer"
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onSelect={() =>
                              setReviewTarget({
                                id: product.id,
                                name: product.name,
                                thumbnail: product.thumbnail,
                              })
                            }
                          >
                            <Star className="w-4 h-4 mr-2" />
                            Add Review
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                disabled={statusPendingId === product.id}
                              >
                                {statusPendingId === product.id ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : productIsActive ? (
                                  <PowerOff className="w-4 h-4 mr-2" />
                                ) : (
                                  <Power className="w-4 h-4 mr-2" />
                                )}
                                {productIsActive
                                  ? "Disable Product"
                                  : "Enable Product"}
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {productIsActive
                                    ? "Disable product?"
                                    : "Enable product?"}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {productIsActive
                                    ? "Disable this product? It will immediately disappear from the customer website, but its existing order history will remain unchanged."
                                    : "Enable this product? It can appear on the customer website again."}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel
                                  disabled={statusPendingId === product.id}
                                >
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleSingleStatusChange(
                                      product.id,
                                      !productIsActive,
                                    )
                                  }
                                  disabled={statusPendingId === product.id}
                                  className={
                                    productIsActive
                                      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      : undefined
                                  }
                                >
                                  {productIsActive
                                    ? "Disable Product"
                                    : "Enable Product"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Are you sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will
                                  permanently delete &quot;{product.name}&quot;
                                  and all its associated media.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    deleteProduct.mutate(product.id)
                                  }
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {isPageLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={`loading-${i}`} className="h-28 w-full rounded-lg" />
          ))
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No products found
          </div>
        ) : (
          filteredProducts.map((product) => {
            const isSelected = selectedIds.has(product.id);
            const media = product.media || [];
            const primaryMedia =
              media.find((m) => m.mediaType === "image") || media[0];
            const imageUrl =
              product.thumbnail || product.img || primaryMedia?.publicUrl;

            const hasDiscount =
              product.discountPrice &&
              product.discountPrice < (product.originalPrice || product.price);
            const productIsActive = product.isActive !== false;

            return (
              <div
                key={product.id}
                className={cn(
                  "border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors",
                  isSelected && "bg-muted/40 border-primary",
                  !productIsActive && "opacity-60",
                )}
              >
                {/* Checkbox and Image */}
                <div className="flex gap-3 mb-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleOne(product.id)}
                    aria-label={`Select ${product.name}`}
                    className="mt-1"
                  />
                  <div
                    className="flex-shrink-0 cursor-pointer"
                    onClick={() =>
                      (window.location.href = withReturnQuery(`/products/${product.id}`))
                    }
                  >
                    <ImageShimmer
                      src={imageUrl}
                      alt={product.name}
                      wrapperClassName="w-16 h-16 rounded-md"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-medium text-sm line-clamp-2 cursor-pointer hover:text-primary"
                      onClick={() =>
                        (window.location.href = withReturnQuery(`/products/${product.id}`))
                      }
                    >
                      {product.name}
                    </h3>
                    <p className="text-xs font-mono text-muted-foreground mt-1">
                      {product.sku || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {typeof product.category === "string"
                        ? product.category
                        : product.category?.name || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Price and Stock */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Price</span>
                    <div className="flex flex-col items-end gap-1">
                      {hasDiscount ? (
                        <>
                          <span className="font-semibold text-sm text-green-600">
                            ₹{product.discountPrice?.toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground line-through">
                            ₹
                            {(product.originalPrice || product.price).toFixed(
                              2,
                            )}
                          </span>
                        </>
                      ) : (
                        <span className="font-semibold text-sm">
                          ₹{(product.originalPrice || product.price).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Stock</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          (product.quantity || product.stockQuantity) === 0 &&
                            "text-red-500",
                          (product.quantity || product.stockQuantity || 0) >
                            0 &&
                            (product.quantity || product.stockQuantity || 0) <
                              10 &&
                            "text-orange-500",
                        )}
                      >
                        {product.quantity || product.stockQuantity || 0}
                      </span>
                      {(product.quantity || product.stockQuantity || 0) ===
                        0 && (
                        <Badge variant="destructive" className="text-xs">
                          Out
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Status
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        productIsActive
                          ? visibilityColors.active
                          : visibilityColors.disabled,
                      )}
                    >
                      {productIsActive ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs"
                    asChild
                  >
                    <Link href={withReturnQuery(`/products/${product.id}`)}>
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs"
                    asChild
                  >
                    <Link href={withReturnQuery(`/products/${product.id}/edit`)}>
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "rounded-lg text-xs",
                          productIsActive &&
                            "text-destructive hover:text-destructive/90",
                        )}
                        disabled={statusPendingId === product.id}
                      >
                        {statusPendingId === product.id ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : productIsActive ? (
                          <PowerOff className="w-3 h-3 mr-1" />
                        ) : (
                          <Power className="w-3 h-3 mr-1" />
                        )}
                        {productIsActive ? "Disable" : "Enable"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {productIsActive
                            ? "Disable product?"
                            : "Enable product?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {productIsActive
                            ? "Disable this product? It will immediately disappear from the customer website, but its existing order history will remain unchanged."
                            : "Enable this product? It can appear on the customer website again."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={statusPendingId === product.id}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            handleSingleStatusChange(product.id, !productIsActive)
                          }
                          disabled={statusPendingId === product.id}
                          className={
                            productIsActive
                              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              : undefined
                          }
                        >
                          {productIsActive ? "Disable Product" : "Enable Product"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-xs text-destructive hover:text-destructive/90"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete &quot;{product.name}&quot; and all its
                          associated media.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteProduct.mutate(product.id)}
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

      {/* Pagination */}
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        total={total}
        onPageChange={(p) => onPageChange?.(p)}
        itemLabel="products"
      />

      {/* One shared dialog for every row — `reviewTarget` says which product. */}
      <AddReviewDialog
        open={Boolean(reviewTarget)}
        onOpenChange={(open) => !open && setReviewTarget(null)}
        product={reviewTarget}
      />
    </div>
  );
}

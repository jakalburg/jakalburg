"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, Settings2, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductTable } from "@/components/products/product-table";
import { DisabledProductsDialog } from "@/components/products/disabled-products-dialog";
import { useProducts, useDisabledProductsCount } from "@/hooks/use-products";
import { TableSkeleton } from "@/components/admin/table-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { ProductSortOption } from "@/services/products.service";
import { useCategoryOptions } from "@/hooks/use-categories";

const PAGE_SIZE = 10;

function ProductsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [page, setPage] = useState(
    () => Number(searchParams.get("page")) || 1,
  );
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("search") || "",
  );
  const debouncedSearchQuery = useDebounce(searchQuery, 350);
  const [sortOption, setSortOption] = useState<ProductSortOption>(
    () => (searchParams.get("sort") as ProductSortOption) || "newest",
  );
  const [categoryFilter, setCategoryFilter] = useState(
    () => searchParams.get("category") || "all",
  );
  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const [defaults, setDefaults] = useState({ delivery: "", returnPolicy: "" });
  const [showDisabled, setShowDisabled] = useState(
    () => searchParams.get("disabled") === "1",
  );
  const [manageDisabledOpen, setManageDisabledOpen] = useState(false);

  // Keep the current filters in the URL so they survive navigating away
  // (e.g. editing a product) and coming back to this page.
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (debouncedSearchQuery) params.set("search", debouncedSearchQuery);
    if (sortOption !== "newest") params.set("sort", sortOption);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (showDisabled) params.set("disabled", "1");
    return params.toString();
  }, [page, debouncedSearchQuery, sortOption, categoryFilter, showDisabled]);

  useEffect(() => {
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString, pathname]);

  const { data, isLoading, isPlaceholderData } = useProducts({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearchQuery,
    sort: sortOption,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    status: showDisabled ? "all" : "active",
  });
  const { data: categories = [] } = useCategoryOptions();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: disabledCount = 0 } = useDisabledProductsCount();

  const products = data?.data ?? [];
  const total = data?.total ?? 0;
  // The server already computed this against the page size it actually applied
  // (it clamps `limit`), so trust it rather than dividing `total` here.
  const totalPages = data?.totalPages ?? 1;

  const handleOpenDefaults = () => {
    const saved = (settings as any)?.productPageDefaults;
    setDefaults({
      delivery: saved?.delivery || "",
      returnPolicy: saved?.returnPolicy || "",
    });
    setDefaultsOpen(true);
  };

  const handleSaveDefaults = () => {
    updateSettings.mutate(
      { productPageDefaults: defaults } as any,
      { onSuccess: () => setDefaultsOpen(false) },
    );
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  const handleSortChange = (sort: ProductSortOption) => {
    setSortOption(sort);
    setPage(1);
  };

  const handleCategoryChange = (category: string) => {
    setCategoryFilter(category);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1">
            {isLoading
              ? "Loading..."
              : `${total} product${total !== 1 ? "s" : ""} total`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {disabledCount > 0 && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setManageDisabledOpen(true)}
            >
              <EyeOff className="w-4 h-4" />
              Manage Disabled ({disabledCount})
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={handleOpenDefaults}>
            <Settings2 className="w-4 h-4" />
            Set Defaults
          </Button>
          <Button asChild className="hidden gap-2 lg:inline-flex">
            <Link href={queryString ? `/products/new?${queryString}` : "/products/new"}>
              <Plus className="w-4 h-4" />
              Add Product
            </Link>
          </Button>
        </div>
      </div>

      {/* Product Table */}
      <div>
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <TableSkeleton rows={5} columns={7} />
            </CardContent>
          </Card>
        ) : (
          <ProductTable
            products={products}
            // `isPlaceholderData` = these rows still belong to the previous
            // page. The table keeps its toolbar and pagination and shows
            // placeholder rows until the page you asked for arrives.
            isPageLoading={isPlaceholderData}
            currentPage={page}
            totalPages={totalPages}
            total={total}
            searchQuery={searchQuery}
            sortOption={sortOption}
            categoryFilter={categoryFilter}
            categories={categories}
            showDisabled={showDisabled}
            returnQuery={queryString}
            onSearchChange={handleSearchChange}
            onSortChange={handleSortChange}
            onCategoryChange={handleCategoryChange}
            onPageChange={setPage}
            onShowDisabledChange={(value) => {
              setShowDisabled(value);
              setPage(1);
            }}
          />
        )}
      </div>

      <Button
        asChild
        size="icon-lg"
        className="fixed bottom-5 right-5 z-40 h-16 w-16 rounded-full shadow-lg lg:hidden"
        aria-label="Add product"
      >
        <Link href={queryString ? `/products/new?${queryString}` : "/products/new"}>
          <Plus className="!h-7 !w-7" />
        </Link>
      </Button>

      <DisabledProductsDialog
        open={manageDisabledOpen}
        onOpenChange={setManageDisabledOpen}
      />

      {/* Set Defaults Dialog */}
      <Dialog open={defaultsOpen} onOpenChange={setDefaultsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Product Page Defaults</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            These will auto-fill for all new products. You can override per-product from the edit form.
          </p>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Delivery Info</label>
              <Textarea
                value={defaults.delivery}
                onChange={(e) => setDefaults((p) => ({ ...p, delivery: e.target.value }))}
                placeholder="e.g. Orders dispatched within 1-3 business days..."
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Return & Exchange Policy</label>
              <Textarea
                value={defaults.returnPolicy}
                onChange={(e) => setDefaults((p) => ({ ...p, returnPolicy: e.target.value }))}
                placeholder="e.g. We accept returns within 7 days..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDefaultsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDefaults} disabled={updateSettings.isPending}>
              {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Defaults
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardContent className="pt-6">
            <TableSkeleton rows={5} columns={7} />
          </CardContent>
        </Card>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}

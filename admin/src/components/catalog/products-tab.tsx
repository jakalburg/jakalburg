"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductTable } from "@/components/products/product-table";
import { useProducts } from "@/hooks/use-products";
import { TableSkeleton } from "@/components/admin/table-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useDebounce } from "@/hooks/use-debounce";
import { ProductSortOption } from "@/services/products.service";
import { useCategories } from "@/hooks/use-categories";

const PAGE_SIZE = 10;

export function ProductsTab() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 350);
  const [sortOption, setSortOption] = useState<ProductSortOption>("newest");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showDisabled, setShowDisabled] = useState(false);

  const { data, isLoading } = useProducts({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearchQuery,
    sort: sortOption,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    status: showDisabled ? "all" : "active",
  });
  const { data: categories = [] } = useCategories();

  const products = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground mt-1">
            {isLoading
              ? "Loading..."
              : `${total} product${total !== 1 ? "s" : ""} total`}
          </p>
        </div>
        <Button asChild className="hidden gap-2 lg:inline-flex">
          <Link href="/products/new">
            <Plus className="w-4 h-4" />
            Add Product
          </Link>
        </Button>
      </div>

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
            currentPage={page}
            totalPages={totalPages}
            total={total}
            searchQuery={searchQuery}
            sortOption={sortOption}
            categoryFilter={categoryFilter}
            categories={categories}
            showDisabled={showDisabled}
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
        className="fixed bottom-5 right-5 z-50 h-16 w-16 rounded-full shadow-lg lg:hidden"
        aria-label="Add product"
      >
        <Link href="/products/new">
          <Plus className="!h-7 !w-7" />
        </Link>
      </Button>
    </div>
  );
}

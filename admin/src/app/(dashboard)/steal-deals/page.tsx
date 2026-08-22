"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StealDealTable } from "@/components/products/steal-deal-table";
import { useProducts } from "@/hooks/use-products";
import { TableSkeleton } from "@/components/admin/table-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useDebounce } from "@/hooks/use-debounce";

const PAGE_SIZE = 10;

function StealDealsPageContent() {
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

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (debouncedSearchQuery) params.set("search", debouncedSearchQuery);
    return params.toString();
  }, [page, debouncedSearchQuery]);

  useEffect(() => {
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString, pathname]);

  const { data, isLoading } = useProducts({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearchQuery,
    status: "all",
    isStealDeal: true,
  });

  const products = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">It&apos;s a Steal Deal</h1>
          <p className="text-muted-foreground mt-1">
            {isLoading
              ? "Loading..."
              : `${total} Steal Deal product${total !== 1 ? "s" : ""} total`}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href={queryString ? `/steal-deals/new?${queryString}` : "/steal-deals/new"}>
            <Plus className="w-4 h-4" />
            Add Steal Deal
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <TableSkeleton rows={5} columns={6} />
          </CardContent>
        </Card>
      ) : (
        <StealDealTable
          products={products}
          currentPage={page}
          totalPages={totalPages}
          total={total}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onPageChange={setPage}
        />
      )}

      <Button
        asChild
        size="icon-lg"
        className="fixed bottom-5 right-5 z-40 h-16 w-16 rounded-full shadow-lg lg:hidden"
        aria-label="Add Steal Deal"
      >
        <Link href={queryString ? `/steal-deals/new?${queryString}` : "/steal-deals/new"}>
          <Plus className="!h-7 !w-7" />
        </Link>
      </Button>
    </div>
  );
}

export default function StealDealsPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardContent className="pt-6">
            <TableSkeleton rows={5} columns={6} />
          </CardContent>
        </Card>
      }
    >
      <StealDealsPageContent />
    </Suspense>
  );
}

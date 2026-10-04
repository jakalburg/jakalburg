"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Pencil, Trash2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { TableSkeleton } from "@/components/admin/table-skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TablePagination } from "@/components/admin/table-pagination";
import { useDebounce } from "@/hooks/use-debounce";
import { useCategoriesPage, useDeleteCategory } from "@/hooks/use-categories";
import type { Category, CategoryGender } from "@/services/categories.service";
import { cn } from "@/lib/utils";

const GENDER_LABEL: Record<CategoryGender, string> = {
  women: "Women",
  men: "Men",
  unisex: "Unisex",
};

/**
 * Catalog → Categories.
 *
 * One flat table, because a product stores exactly one category slug and holds
 * gender separately — the parent/subcategory tree this screen used to render
 * came from kaybykhushie and had nowhere to land on a Jakalburg product.
 *
 * Shared by /categories and /catalog/categories, which were previously two
 * near-identical 400-line copies of the same table.
 */
export function CategoriesTab() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  // Debounced so typing is one request per pause rather than one per keystroke.
  const term = useDebounce(search.trim(), 350);

  // Only the rows on screen are fetched; the server filters and pages.
  const { data, isLoading, isError, isPlaceholderData } = useCategoriesPage({
    page,
    search: term,
  });
  const deleteCategory = useDeleteCategory();

  const pageRows = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  // `isPlaceholderData` means what's in `data` still belongs to the PREVIOUS
  // page — the counter has already moved, so showing those rows would caption
  // page 2 with page 1's contents. Show the skeleton until the real page lands.
  // (The pagination control below stays mounted, so the page number you clicked
  // remains visible and the table doesn't collapse while it loads.)
  const isPageLoading = isLoading || isPlaceholderData;

  // Both corrections are applied during render rather than in an effect: React
  // re-runs this component before touching the DOM, so the table never paints
  // a page it is about to leave. (https://react.dev/learn/you-might-not-need-an-effect)
  //
  // A new search starts at page 1 — otherwise searching from page 4 requests
  // page 4 of a one-page result and shows nothing.
  const [lastTerm, setLastTerm] = useState(term);
  if (term !== lastTerm) {
    setLastTerm(term);
    setPage(1);
  }
  // Deleting the last row of the last page can leave `page` past the end.
  if (data && page > totalPages) setPage(totalPages);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteCategory.mutate(pendingDelete.id, {
      onSettled: () => setPendingDelete(null),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories"
            className="h-9 pl-8"
          />
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/categories/new">
            <Plus className="mr-2 h-4 w-4" />
            Add category
          </Link>
        </Button>
      </div>

      {isError ? (
        <Empty
          title="Couldn't load categories"
          hint="The categories table may not exist yet — run the pending database migration on the server."
        />
      ) : isPageLoading ? (
        <TableSkeleton rows={8} columns={5} />
      ) : pageRows.length === 0 ? (
        <Empty
          title={term ? "No categories match that search" : "No categories yet"}
          hint={
            term
              ? "Try a different term."
              : "Add one, or it will appear here automatically once a product uses it."
          }
        />
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[64px]"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[150px]">Slug</TableHead>
                  <TableHead className="w-[160px]">Gender</TableHead>
                  <TableHead className="w-[90px] text-right">
                    Products
                  </TableHead>
                  <TableHead className="w-[100px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((category) => (
                  <TableRow
                    key={category.id}
                    className={cn(!category.isActive && "opacity-55")}
                  >
                    <TableCell>
                      <Thumb category={category} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{category.name}</span>
                        {!category.isActive && (
                          <Badge variant="secondary" className="text-[10px]">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      {category.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {category.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {category.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <GenderBadges genders={category.genders} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {category.productCount ?? 0}
                    </TableCell>
                    <TableCell>
                      <RowActions
                        category={category}
                        onDelete={() => setPendingDelete(category)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="grid gap-3 md:hidden">
            {pageRows.map((category) => (
              <div
                key={category.id}
                className={cn(
                  "rounded-lg border p-4",
                  !category.isActive && "opacity-55",
                )}
              >
                <div className="flex items-start gap-3">
                  <Thumb category={category} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{category.name}</p>
                      {!category.isActive && (
                        <Badge variant="secondary" className="text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <code className="text-xs text-muted-foreground">
                      {category.slug}
                    </code>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <GenderBadges genders={category.genders} />
                  <span className="text-xs text-muted-foreground">
                    {category.productCount ?? 0} product
                    {category.productCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-3">
                  <RowActions
                    category={category}
                    onDelete={() => setPendingDelete(category)}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Outside the branches above so it stays put while a page loads — the
          number you clicked keeps its highlight instead of disappearing with
          the rows. Hidden only on the very first load, when there are no
          totals to render yet. */}
      {!isError && !isLoading && (
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          itemLabel="categories"
        />
      )}

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &ldquo;{pendingDelete?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.productCount
                ? `${pendingDelete.productCount} product(s) use this category, so it can't be deleted. Deactivate it instead to take it off the storefront while keeping those products intact.`
                : "This removes the category record. No products reference it, so nothing in the catalogue changes."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={
                deleteCategory.isPending || !!pendingDelete?.productCount
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Thumb({ category }: { category: Category }) {
  if (!category.image) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border bg-muted text-xs font-medium text-muted-foreground">
        {category.name.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <ImageShimmer
      src={category.image}
      alt={category.name}
      wrapperClassName="h-10 w-10 shrink-0 rounded border"
    />
  );
}

/** Empty `genders` means "wherever there's stock" — say so rather than show nothing. */
function GenderBadges({ genders }: { genders: CategoryGender[] }) {
  if (!genders || genders.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">Any with stock</span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {genders.map((g) => (
        <Badge key={g} variant="outline" className="text-[10px]">
          {GENDER_LABEL[g] ?? g}
        </Badge>
      ))}
    </div>
  );
}

function RowActions({
  category,
  onDelete,
}: {
  category: Category;
  onDelete: () => void;
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
        <Link href={`/categories/${category.id}/edit`} title="Edit">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        onClick={onDelete}
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Delete</span>
      </Button>
    </div>
  );
}

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-14 text-center">
      <Inbox className="mb-3 h-10 w-10 text-muted-foreground/30" />
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

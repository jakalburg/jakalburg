"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageDto } from "@/services/pages.service";
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
import { Card, CardContent } from "@/components/ui/card";
import { TablePagination } from "@/components/admin/table-pagination";
import { TableSkeleton } from "@/components/admin/table-skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreHorizontal, Pencil, Trash2, Eye, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useDeletePage, usePagesPage } from "@/hooks/use-pages";

/**
 * A row in the table. Most are `Page` records, but a storefront page whose
 * content doesn't fit that model can be listed too — it supplies its own
 * editor route and opts out of deletion.
 */
type PageRow = PageDto & {
  /** Editor route. Defaults to the `Page` edit screen. */
  href?: string;
  /** False for pages that aren't `Page` records and so can't be deleted. */
  deletable?: boolean;
};

/**
 * Pages that live outside the `Page` model but belong in this list, so there's
 * one place to go looking for storefront content.
 *
 * Contact is structured — a heading, a blurb, a "need it today" block and a
 * banner — rather than the single rich-text column `Page` provides, so it keeps
 * its own singleton (`WebsiteContact`) and its own form at /pages/contact.
 */
const EXTERNAL_PAGES: PageRow[] = [
  {
    id: "contact",
    title: "Contact Page",
    slug: "contact",
    content: "",
    status: "active",
    href: "/pages/contact",
    deletable: false,
  },
];

/** Where a row's View/Edit actions point. */
const routeFor = (page: PageRow) => page.href ?? `/pages/${page.id}`;
const editRouteFor = (page: PageRow) => page.href ?? `/pages/${page.id}/edit`;

export function PagesTable() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  // `page` is already a CMS page in this file, so the pagination state is
  // named `currentPage` to keep the two apart.
  const [currentPage, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deletePageMutation = useDeletePage();

  // Debounced so typing is one request per pause, not one per keystroke.
  const term = useDebounce(searchQuery.trim(), 350);

  // Only the rows on screen are fetched; the server filters and pages.
  const { data, isLoading, isPlaceholderData } = usePagesPage({
    page: currentPage,
    search: term,
  });

  // `isPlaceholderData` means `data` still belongs to the previous page — the
  // controls have already moved on, so the rows are swapped for a skeleton
  // until the real page arrives rather than shown stale under a new number.
  const isPageLoading = isLoading || isPlaceholderData;

  const serverRows = data?.data ?? [];
  const serverTotal = data?.total ?? 0;
  const serverTotalPages = data?.totalPages ?? 1;

  // EXTERNAL_PAGES aren't `Page` records, so the server can't page or filter
  // them. They're a fixed handful, so they're filtered here and pinned to the
  // LAST page — that keeps them reachable without pushing a server row off
  // page 1 or repeating them on every page.
  const externals = EXTERNAL_PAGES.filter((p) =>
    p.title.toLowerCase().includes(term.toLowerCase()),
  );
  const onLastPage = currentPage >= serverTotalPages;
  const pageRows: PageRow[] = onLastPage
    ? [...serverRows, ...externals]
    : serverRows;
  const total = serverTotal + externals.length;
  const totalPages = serverTotalPages;

  // Both adjustments run during render rather than in an effect, so the table
  // never paints a page it is about to leave.
  //
  // A new search starts at page 1 — otherwise searching from page 4 asks for
  // page 4 of a one-page result and shows nothing.
  const [lastTerm, setLastTerm] = useState(term);
  if (term !== lastTerm) {
    setLastTerm(term);
    setPage(1);
  }
  // Deleting the last row of the last page can leave `currentPage` past the end.
  if (data && currentPage > totalPages) setPage(totalPages);

  const handleDelete = async () => {
    if (deleteId) {
      await deletePageMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  // Only true on the very first load — paging and searching keep the current
  // rows on screen via placeholderData rather than flashing this.
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <TableSkeleton rows={5} columns={5} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm flex-1 md:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search pages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isPageLoading ? (
        <Card>
          <CardContent className="pt-6">
            <TableSkeleton rows={5} columns={5} />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="border rounded-lg hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No pages found
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((page) => (
                    <TableRow
                      key={page.id}
                      className="group cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(routeFor(page))}
                    >
                      <TableCell className="font-medium">
                        {page.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        /{page.slug}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            page.status === "active" ? "default" : "secondary"
                          }
                          className={cn(
                            page.status === "active"
                              ? "bg-green-100 text-green-700 hover:bg-green-100"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-100",
                          )}
                        >
                          {page.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {page.updatedAt
                          ? format(new Date(page.updatedAt), "MMM d, yyyy")
                          : "N/A"}
                      </TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={routeFor(page)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={editRouteFor(page)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            {page.deletable !== false && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteId(page.id!)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          {pageRows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground md:hidden">
              No pages found
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {pageRows.map((page) => (
                <Card key={page.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <Link href={routeFor(page)} className="block space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <h3 className="font-medium text-sm break-words">
                            {page.title}
                          </h3>
                          <p className="text-xs text-muted-foreground break-all">
                            /{page.slug}
                          </p>
                        </div>
                        <Badge
                          variant={
                            page.status === "active" ? "default" : "secondary"
                          }
                          className={cn(
                            "text-xs whitespace-nowrap",
                            page.status === "active"
                              ? "bg-green-100 text-green-700 hover:bg-green-100"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-100",
                          )}
                        >
                          {page.status}
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Updated:{" "}
                        {page.updatedAt
                          ? format(new Date(page.updatedAt), "MMM d, yyyy")
                          : "N/A"}
                      </div>
                    </Link>

                    <div className="flex gap-2 pt-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Link href={routeFor(page)}>
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Link href={editRouteFor(page)}>
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </Link>
                      </Button>
                      {page.deletable !== false && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteId(page.id!)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Outside the branch above so the page you clicked keeps its highlight
          while the rows load, instead of vanishing with them. */}
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        itemLabel="pages"
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

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
import { useDeletePage } from "@/hooks/use-pages";

interface PagesTableProps {
  pages: PageDto[];
}

export function PagesTable({ pages }: PagesTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deletePageMutation = useDeletePage();

  const pagesArray = Array.isArray(pages) ? pages : [];

  const filteredPages = pagesArray.filter((page) =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleDelete = async () => {
    if (deleteId) {
      await deletePageMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

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
            {filteredPages.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  No pages found
                </TableCell>
              </TableRow>
            ) : (
              filteredPages.map((page) => (
                <TableRow
                  key={page.id}
                  className="group cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/pages/${page.id}`)}
                >
                  <TableCell className="font-medium">{page.title}</TableCell>
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
                          <Link href={`/pages/${page.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/pages/${page.id}/edit`}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(page.id!)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
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
      {filteredPages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground md:hidden">
          No pages found
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {filteredPages.map((page) => (
            <Card key={page.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <Link href={`/pages/${page.id}`} className="block space-y-3">
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
                      variant={page.status === "active" ? "default" : "secondary"}
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
                    <Link href={`/pages/${page.id}`}>
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
                    <Link href={`/pages/${page.id}/edit`}>
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(page.id!)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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

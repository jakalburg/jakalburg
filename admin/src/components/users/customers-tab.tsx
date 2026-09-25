"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/admin/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { useCustomers, useDeleteCustomer } from "@/hooks/use-customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Search, Phone } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import {
  TablePagination,
  TABLE_PAGE_SIZE,
} from "@/components/admin/table-pagination";

type SortKey = "name-asc" | "name-desc" | "orders-desc" | "spent-desc" | "joined-desc";

export function CustomersTab() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("joined-desc");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Search, sort and paging all happen in the database.
  const { data, isLoading, error } = useCustomers({
    page,
    limit: TABLE_PAGE_SIZE,
    search: debouncedSearch.trim() || undefined,
    sort: sortKey,
  });
  const { mutate: deleteCustomer } = useDeleteCustomer();

  const customers = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // A new search or sort invalidates the page the admin was on.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortKey]);

  const handleDelete = (id: string) => {
    deleteCustomer(id, {
      onSuccess: () => {
        toast.success("Customer and all related data deleted successfully");
      },
      onError: (err: any) => {
        toast.error("Failed to delete customer", { description: err.message });
      },
    });
  };

  // Already the right page, in the right order — the server did both.
  const processedCustomers = customers as any[];

  const columns = [
    {
      header: "Customer",
      cell: (customer: any) => {
        const initials =
          customer.name
            ?.split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase() || "??";

        return (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={customer.image} alt={customer.name} />
              <AvatarFallback className="bg-gradient-primary text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="font-medium">{customer.name || "N/A"}</div>
          </div>
        );
      },
    },
    {
      header: "Email",
      cell: (customer: any) => (
        <div className="text-muted-foreground">{customer.email || "N/A"}</div>
      ),
    },
    {
      header: "Phone",
      cell: (customer: any) =>
        customer.phone ? (
          <a
            href={`tel:${customer.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-primary hover:underline font-medium"
          >
            <Phone className="w-3 h-3" />
            {customer.phone}
          </a>
        ) : (
          <div className="text-muted-foreground">-</div>
        ),
    },
    {
      header: "Total Orders",
      cell: (customer: any) => <div>{customer.totalOrders || 0}</div>,
    },
    {
      header: "Total Spent",
      cell: (customer: any) => (
        <div className="font-medium">
          ₹{customer.totalSpent?.toFixed(2) || "0.00"}
        </div>
      ),
    },
    {
      header: "Joined",
      cell: (customer: any) => (
        <div className="text-sm text-muted-foreground">
          {customer.createdAt
            ? format(new Date(customer.createdAt), "MMM dd, yyyy")
            : "N/A"}
        </div>
      ),
    },
    {
      header: "Actions",
      cell: (customer: any) => (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive/90"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete
                <span className="font-bold">
                  {" "}
                  {customer.name || customer.email}{" "}
                </span>
                and ALL their orders, reviews, and related data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDelete(customer.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
    },
  ];

  const toolbar = (
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email or phone..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="joined-desc">Newest first</SelectItem>
          <SelectItem value="name-asc">Name A → Z</SelectItem>
          <SelectItem value="name-desc">Name Z → A</SelectItem>
          <SelectItem value="orders-desc">Most orders</SelectItem>
          <SelectItem value="spent-desc">Highest spent</SelectItem>
        </SelectContent>
      </Select>
      {searchQuery && (
        <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
          Clear
        </Button>
      )}
      <span className="text-sm text-muted-foreground self-center ml-auto whitespace-nowrap">
        {processedCustomers.length} of {total}
      </span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Desktop View */}
      <div className="hidden md:block">
        {toolbar}
        <DataTable
          title="All Customers"
          data={processedCustomers}
          columns={columns}
          isLoading={isLoading}
          error={error}
          emptyMessage={searchQuery ? "No customers match your search" : "No customers found"}
          getRowKey={(customer: any) => customer.id}
          onRowClick={(customer: any) => router.push(`/customers/${customer.id}`)}
        />
        {!isLoading && !error && (
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
            itemLabel="customers"
          />
        )}
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {toolbar}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : processedCustomers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? "No customers match your search" : "No customers found"}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {processedCustomers.map((customer: any) => {
              const initials =
                customer.name
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase() || "??";

              return (
                <Card
                  key={customer.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/customers/${customer.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/customers/${customer.id}`);
                    }
                  }}
                  className="cursor-pointer transition-colors hover:bg-muted/30"
                >
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={customer.image} alt={customer.name} />
                          <AvatarFallback className="bg-gradient-primary text-white">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{customer.name || "N/A"}</p>
                          <p className="text-xs text-muted-foreground">
                            {customer.email || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="border-t pt-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Phone</p>
                            {customer.phone ? (
                              <a
                                href={`tel:${customer.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-sm text-primary hover:underline"
                              >
                                <Phone className="w-3 h-3" />
                                {customer.phone}
                              </a>
                            ) : (
                              <p className="text-sm">-</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Joined</p>
                            <p className="text-xs">
                              {customer.createdAt
                                ? format(new Date(customer.createdAt), "MMM dd, yyyy")
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Total Orders</p>
                            <p className="text-sm font-medium">{customer.totalOrders || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total Spent</p>
                            <p className="text-sm font-medium">
                              ₹{customer.totalSpent?.toFixed(2) || "0.00"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full text-destructive hover:text-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete
                              <span className="font-bold">
                                {" "}{customer.name || customer.email}{" "}
                              </span>
                              and ALL their orders, reviews, and related data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(customer.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {!isLoading && !error && (
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
            itemLabel="customers"
          />
        )}
      </div>
    </div>
  );
}

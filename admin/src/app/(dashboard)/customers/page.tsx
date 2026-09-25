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
import { useDebounce } from "@/hooks/use-debounce";
import {
  TablePagination,
  TABLE_PAGE_SIZE,
} from "@/components/admin/table-pagination";

export default function CustomersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data, isLoading, error } = useCustomers({
    page,
    limit: TABLE_PAGE_SIZE,
    search: debouncedSearch.trim() || undefined,
  });
  const { mutate: deleteCustomer } = useDeleteCustomer();

  // Server-side search + paging; this is already the page to render.
  const filteredCustomers = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground mt-1">
          View and manage your customer base
        </p>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or phone..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {searchQuery && (
          <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
            Clear
          </Button>
        )}
        <span className="text-sm text-muted-foreground ml-auto">
          {filteredCustomers.length} of {total} customers
        </span>
      </div>

      <DataTable
        title="All Customers"
        data={filteredCustomers}
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
  );
}

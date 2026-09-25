"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { adminService } from "@/services/admin.service";
import Loader from "@/components/ui/loader";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { useDebounce } from "@/hooks/use-debounce";
import {
  TablePagination,
  TABLE_PAGE_SIZE,
} from "@/components/admin/table-pagination";

export default function AdminStaffPage() {
  const router = useRouter();
  const axiosAuth = useAxiosAuth();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  // Search and paging both happen server-side; `admins` holds one page.
  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const result = await adminService(axiosAuth).getAll({
        page,
        limit: TABLE_PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
      });
      setAdmins(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (error) {
      toast.error("Failed to fetch admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

  // A new search term invalidates the page the admin was on.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const handleDelete = async (id: string) => {
    try {
      await adminService(axiosAuth).delete(id);
      toast.success("Admin deleted successfully");
      fetchAdmins();
    } catch (error) {
      toast.error("Failed to delete admin");
    }
  };

  // Already filtered by the server.
  const filteredAdmins = admins;

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Admins</h1>
          <p className="text-muted-foreground">
            Manage administrative access to the platform
          </p>
        </div>
        <Button asChild>
          <Link href="/admin-staff/new">
            <Plus className="mr-2 h-4 w-4" /> Add Admin
          </Link>
        </Button>
      </div>

      <div className="flex items-center py-4">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search admins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAdmins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No admins found.
                </TableCell>
              </TableRow>
            ) : (
              filteredAdmins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>
                    {admin.profiles[0]?.firstName} {admin.profiles[0]?.lastName}
                  </TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell className="capitalize">{admin.role}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin-staff/${admin.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the admin account.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(admin.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        currentPage={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        itemLabel="admins"
      />
    </div>
  );
}

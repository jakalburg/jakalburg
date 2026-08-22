"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import Link from "next/link";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

export function StaffTab() {
  const axiosAuth = useAxiosAuth();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchAdmins = async () => {
    try {
      const data = await adminService(axiosAuth).getAll();
      setAdmins(data);
    } catch (error) {
      toast.error("Failed to fetch admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await adminService(axiosAuth).delete(id);
      toast.success("Admin deleted successfully");
      fetchAdmins();
    } catch (error) {
      toast.error("Failed to delete admin");
    }
  };

  const filteredAdmins = admins.filter(
    (admin) =>
      admin.email.toLowerCase().includes(search.toLowerCase()) ||
      admin.profiles[0]?.firstName
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      admin.profiles[0]?.lastName?.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading)
    return (
      <div className="py-20 flex justify-center">
        <Loader />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search admins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button asChild>
          <Link href="/admin-staff/new">
            <Plus className="mr-2 h-4 w-4" /> Add Admin
          </Link>
        </Button>
      </div>

      {/* Desktop View */}
      <div className="border rounded-md hidden md:block">
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

      {/* Mobile View */}
      {filteredAdmins.length === 0 ? (
        <div className="grid md:hidden text-center py-8 text-muted-foreground">
          No admins found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {filteredAdmins.map((admin) => (
            <Card key={admin.id}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {/* Header: Name and Role */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {admin.profiles[0]?.firstName}{" "}
                        {admin.profiles[0]?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {admin.email}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {admin.role}
                    </Badge>
                  </div>

                  {/* Action Buttons */}
                  <div className="border-t pt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      asChild
                    >
                      <Link href={`/admin-staff/${admin.id}`}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

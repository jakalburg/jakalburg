"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Plus, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDelivery } from "@/lib/delivery-context";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/admin/table-skeleton";
import { TablePagination } from "@/components/admin/table-pagination";
import { useClientPagination } from "@/hooks/use-client-pagination";

export default function DeliveryCompaniesPage() {
  const { companies, addCompany, updateCompany, deleteCompany } = useDelivery();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    trackingUrl: "",
    isActive: true,
  });

  const { pageRows, page, totalPages, total, setPage } =
    useClientPagination(companies);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      addCompany(formData);
      toast.success("Delivery company added successfully");
      setIsOpen(false);
      setFormData({ name: "", trackingUrl: "", isActive: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteCompany(id);
      toast.success("Delivery company deleted");
    }
  };

  const toggleActive = (id: string, currentStatus: boolean) => {
    updateCompany(id, { isActive: !currentStatus });
    toast.success(`Company ${!currentStatus ? "activated" : "deactivated"}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 ">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/delivery">
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Delivery Companies
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage delivery service providers
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add Delivery Company</DialogTitle>
                <DialogDescription>
                  Add a new delivery service provider
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="FedEx, UPS, DHL..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trackingUrl">Tracking URL</Label>
                  <Input
                    id="trackingUrl"
                    value={formData.trackingUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, trackingUrl: e.target.value })
                    }
                    placeholder="https://example.com/track?id="
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The tracking number will be appended to this URL
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">Active</Label>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSubmitting ? "Adding..." : "Add Company"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Companies Table */}
      <Card className="">
        <CardHeader>
          <CardTitle>All Companies</CardTitle>
          <CardDescription>
            Manage your delivery service providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={3} columns={4} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Tracking URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No delivery companies added
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">
                        {company.name}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {company.trackingUrl}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={company.isActive}
                            onCheckedChange={() =>
                              toggleActive(company.id, company.isActive)
                            }
                          />
                          <Badge
                            variant={company.isActive ? "default" : "secondary"}
                          >
                            {company.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(company.id, company.name)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          {!isLoading && (
            <TablePagination
              currentPage={page}
              totalPages={totalPages}
              total={total}
              onPageChange={setPage}
              itemLabel="companies"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

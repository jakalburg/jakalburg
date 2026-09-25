"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/admin/data-table";
import { TableSkeleton } from "@/components/admin/table-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  useFabrics,
  useCreateFabric,
  useUpdateFabric,
  useDeleteFabric,
} from "@/hooks/use-fabrics";
import type { Fabric } from "@/services/fabrics.service";
import {
  TablePagination,
  TABLE_PAGE_SIZE,
} from "@/components/admin/table-pagination";

export default function FabricsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useFabrics({
    page,
    limit: TABLE_PAGE_SIZE,
  });
  const fabrics = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const createMutation = useCreateFabric();
  const updateMutation = useUpdateFabric();
  const deleteMutation = useDeleteFabric();

  // Inline "add" form state.
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Edit dialog state.
  const [editing, setEditing] = useState<Fabric | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    await createMutation.mutateAsync({
      name,
      description: newDescription.trim() || undefined,
    });
    setNewName("");
    setNewDescription("");
  };

  const openEdit = (fabric: Fabric) => {
    setEditing(fabric);
    setEditName(fabric.name);
    setEditDescription(fabric.description ?? "");
  };

  const handleUpdate = async () => {
    if (!editing) return;
    const name = editName.trim();
    if (!name) return;
    await updateMutation.mutateAsync({
      id: editing.id,
      data: { name, description: editDescription.trim() || undefined },
    });
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    {
      header: "Name",
      cell: (fabric: Fabric) => (
        <span className="font-medium">{fabric.name}</span>
      ),
    },
    {
      header: "Slug",
      cell: (fabric: Fabric) => (
        <code className="text-xs text-muted-foreground">{fabric.slug}</code>
      ),
    },
    {
      header: "Description",
      cell: (fabric: Fabric) => (
        <div className="text-sm text-muted-foreground line-clamp-1 max-w-md">
          {fabric.description || "-"}
        </div>
      ),
    },
    {
      header: "Actions",
      className: "w-[120px]",
      cell: (fabric: Fabric) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(fabric)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={deletingId === fabric.id}
              >
                {deletingId === fabric.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this fabric?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes &quot;{fabric.name}&quot; from the pick-list.
                  Products already saved with this fabric keep their value — it
                  just won&apos;t be offered as a suggestion anymore.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(fabric.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fabrics</h1>
        <p className="text-muted-foreground mt-1">
          The curated fabric list the product form suggests. Products can still
          use a fabric that isn&apos;t on this list.
        </p>
      </div>

      {/* Inline add */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="fabric-name">Name</Label>
              <Input
                id="fabric-name"
                placeholder="Mercerised cotton piqué"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fabric-description">
                Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="fabric-description"
                placeholder="Breathable, structured knit with a soft hand-feel."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
            </div>
            <Button
              onClick={handleAdd}
              disabled={!newName.trim() || createMutation.isPending}
              className="gap-2"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add Fabric
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading || error || fabrics.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <TableSkeleton rows={5} columns={columns.length} />
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                Error loading fabrics: {error.message}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No fabrics yet — add your first one above.
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block">
            <DataTable
              title="All Fabrics"
              data={fabrics}
              columns={columns}
              getRowKey={(fabric: Fabric) => fabric.id}
            />
          </div>

          {/* Mobile */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {fabrics.map((fabric) => (
              <div key={fabric.id} className="border rounded-lg p-4 bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{fabric.name}</h3>
                    <code className="text-xs text-muted-foreground">
                      {fabric.slug}
                    </code>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => openEdit(fabric)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg text-destructive hover:text-destructive"
                          disabled={deletingId === fabric.id}
                        >
                          {deletingId === fabric.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete this fabric?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes &quot;{fabric.name}&quot; from the
                            pick-list. Products already saved with this fabric
                            keep their value.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(fabric.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {fabric.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                    {fabric.description}
                  </p>
                )}
              </div>
            ))}
          </div>

          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
            itemLabel="fabrics"
          />
        </>
      )}

      {/* Edit dialog */}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit fabric</DialogTitle>
            <DialogDescription>
              Renaming updates the slug too. Existing products keep their stored
              fabric value.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fabric-name">Name</Label>
              <Input
                id="edit-fabric-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-fabric-description">
                Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="edit-fabric-description"
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!editName.trim() || updateMutation.isPending}
              className="gap-2"
            >
              {updateMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAxiosAuth from "@/hooks/use-axios-auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { format } from "date-fns";
import { InboxIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  contactService,
  type Contact,
  type ContactType,
  type ContactStatus,
} from "@/services/contact.service";
import { TablePagination } from "@/components/admin/table-pagination";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";

interface ContactTabProps {
  type: ContactType;
}

export function ContactTab({ type }: ContactTabProps) {
  const api = useAxiosAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  // Only the page on screen is fetched. `placeholderData` keeps the totals and
  // the pagination control stable across a page change; the rows themselves are
  // swapped for a loading state (see `isPageLoading`) rather than shown stale.
  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ["contacts", type, page],
    queryFn: () =>
      contactService(api).getAll(type, { page, limit: DEFAULT_PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContactStatus }) =>
      contactService(api).updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", type] });
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactService(api).remove(id),
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["contacts", type] });
      setSelectedContact((prev) => (prev?.id === deletedId ? null : prev));
      setContactToDelete(null);
      toast.success("Submission deleted");
    },
    onError: () => {
      toast.error("Failed to delete submission");
    },
  });

  const pageRows = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  // `isPlaceholderData` means `data` still belongs to the previous page — or to
  // the previous inbox, when you switch tabs. Either way the rows no longer
  // match what the controls say, so show loading until the real page arrives.
  const isPageLoading = isLoading || isPlaceholderData;

  // Both adjustments happen during render rather than in an effect, so the
  // table never paints a page it is about to leave.
  //
  // Switching inbox starts at page 1 — the other inbox may not have as many
  // pages, and page 4 of a 1-page inbox is an empty table.
  const [lastType, setLastType] = useState(type);
  if (type !== lastType) {
    setLastType(type);
    setPage(1);
  }
  // Deleting the last row of the last page can leave `page` past the end.
  if (data && page > totalPages) setPage(totalPages);

  // First load only — there are no totals yet, so there's no pagination control
  // worth keeping on screen. Later loads keep it (see the main return).
  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading submissions...
      </div>
    );
  }

  // Not while a page is loading: the rows are empty then by definition.
  if (!isPageLoading && pageRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <InboxIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-lg mb-1">No Submissions Found</h3>
        <p className="text-muted-foreground text-sm max-w-sm">
          There are no messages in this inbox yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isPageLoading ? (
        <div className="p-8 text-center text-muted-foreground border rounded-md">
          Loading submissions...
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="border rounded-md hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>
                    {type === "newsletter" ? "Email" : "Customer"}
                  </TableHead>
                  {type === "contact_us" && <TableHead>Subject</TableHead>}
                  {type !== "newsletter" && <TableHead>Message</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((contact) => (
                  <TableRow
                    key={contact.id}
                    // Whole row opens the details dialog (newsletter rows have no
                    // message/detail, so they stay non-clickable). The Status and
                    // Actions cells stopPropagation so they still work on their own.
                    onClick={
                      type !== "newsletter"
                        ? () => setSelectedContact(contact)
                        : undefined
                    }
                    className={
                      type !== "newsletter"
                        ? "cursor-pointer hover:bg-muted/50 transition-colors"
                        : undefined
                    }
                  >
                    <TableCell className="whitespace-nowrap">
                      {format(
                        new Date(contact.createdAt),
                        "MMM d, yyyy h:mm a",
                      )}
                    </TableCell>
                    {type !== "newsletter" && (
                      <TableCell>
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {contact.email}
                        </div>
                      </TableCell>
                    )}
                    {type === "newsletter" && (
                      <TableCell className="font-medium">
                        {contact.email}
                      </TableCell>
                    )}
                    {type === "contact_us" && (
                      <TableCell className="font-medium">
                        {contact.subject || "-"}
                      </TableCell>
                    )}
                    {type !== "newsletter" && (
                      <TableCell>
                        <div
                          className="max-w-md line-clamp-2 text-sm break-all"
                          title="Click the row to view the full message"
                        >
                          {contact.message}
                        </div>
                      </TableCell>
                    )}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        defaultValue={contact.status}
                        onValueChange={(value) =>
                          updateStatusMutation.mutate({
                            id: contact.id,
                            status: value as ContactStatus,
                          })
                        }
                      >
                        <SelectTrigger className="w-[110px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unread">
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                              Unread
                            </div>
                          </SelectItem>
                          <SelectItem value="read">
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-slate-300 mr-2" />
                              Read
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setContactToDelete(contact)}
                        title="Delete submission"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {pageRows.map((contact) => (
              <Card key={contact.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  {/* Header: Email and Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <h4 className="font-medium text-sm break-words">
                        {contact.email}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {format(
                          new Date(contact.createdAt),
                          "MMM d, yyyy h:mm a",
                        )}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setContactToDelete(contact)}
                      title="Delete submission"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Name (if not newsletter) */}
                  {type !== "newsletter" && (
                    <div>
                      <p className="text-xs text-muted-foreground">From</p>
                      <p className="text-sm font-medium">{contact.name}</p>
                    </div>
                  )}

                  {/* Subject (for contact_us) */}
                  {type === "contact_us" && (
                    <div>
                      <p className="text-xs text-muted-foreground">Subject</p>
                      <p className="text-sm font-medium">
                        {contact.subject || "-"}
                      </p>
                    </div>
                  )}

                  {/* Message (if not newsletter) */}
                  {type !== "newsletter" && (
                    <div
                      className="cursor-pointer hover:bg-muted/30 p-2 -m-2 rounded transition-colors"
                      onClick={() => setSelectedContact(contact)}
                    >
                      <p className="text-xs text-muted-foreground">Message</p>
                      <p className="text-sm break-words break-all whitespace-pre-wrap line-clamp-3">
                        {contact.message}
                      </p>
                    </div>
                  )}

                  {/* Status Selector */}
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Status</p>
                    <Select
                      defaultValue={contact.status}
                      onValueChange={(value) =>
                        updateStatusMutation.mutate({
                          id: contact.id,
                          status: value as ContactStatus,
                        })
                      }
                    >
                      <SelectTrigger className="w-full h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unread">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                            Unread
                          </div>
                        </SelectItem>
                        <SelectItem value="read">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-slate-300 mr-2" />
                            Read
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Outside the branch above so the page you clicked keeps its highlight
          while the rows load, instead of vanishing with them. */}
      <TablePagination
        currentPage={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        itemLabel="submissions"
      />

      {/* Message View Modal */}
      <Dialog
        open={!!selectedContact}
        onOpenChange={(open) => !open && setSelectedContact(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
          </DialogHeader>

          {selectedContact && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">
                    Date
                  </label>
                  <p className="text-sm mt-1">
                    {format(
                      new Date(selectedContact.createdAt),
                      "MMMM d, yyyy h:mm a",
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">
                    Status
                  </label>
                  <div className="mt-1">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                        selectedContact.status === "unread"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
                      )}
                    >
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full mr-1.5",
                          selectedContact.status === "unread"
                            ? "bg-blue-500"
                            : "bg-slate-400",
                        )}
                      />
                      {selectedContact.status === "unread" ? "Unread" : "Read"}
                    </span>
                  </div>
                </div>
              </div>

              {type !== "newsletter" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase">
                      Name
                    </label>
                    <p className="text-sm font-medium mt-1">
                      {selectedContact.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase">
                      Email
                    </label>
                    <p className="text-sm mt-1">{selectedContact.email}</p>
                  </div>
                </div>
              )}

              {type === "newsletter" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">
                    Subscriber Email
                  </label>
                  <p className="text-sm mt-1">{selectedContact.email}</p>
                </div>
              )}

              {type === "contact_us" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">
                    Subject
                  </label>
                  <p className="text-sm font-medium mt-1">
                    {selectedContact.subject || "-"}
                  </p>
                </div>
              )}

              {type !== "newsletter" && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <label className="text-xs font-medium text-muted-foreground uppercase">
                    Full Message
                  </label>
                  <p className="text-sm mt-2 leading-relaxed whitespace-pre-wrap break-words break-all">
                    {selectedContact.message}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!contactToDelete}
        onOpenChange={(open) => !open && setContactToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete submission?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the message from{" "}
              <span className="font-medium text-foreground">
                {contactToDelete?.email}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() =>
                contactToDelete && deleteMutation.mutate(contactToDelete.id)
              }
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Helper for conditional classes
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

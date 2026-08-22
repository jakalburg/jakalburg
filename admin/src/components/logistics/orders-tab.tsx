"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatName } from "@/lib/utils";
import { format } from "date-fns";
import {
  useOrders,
  useConfirmOrder,
  useRejectOrder,
  useDeleteOrder,
  useSyncOrdersToSheet,
} from "@/hooks/use-orders";
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
import { useQueryClient } from "@tanstack/react-query";
import { Eye, CheckCircle, XCircle, Truck, Trash2, Search, FileSpreadsheet, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { ShipOrderDialog } from "@/components/orders/ship-order-dialog";
import { AddManualOrderDialog } from "@/components/orders/add-manual-order-dialog";
import { Card } from "@/components/ui/card";

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  confirmed: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  processing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  shipped: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  out_for_delivery: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  delivered: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  rto_received: "bg-violet-500/10 text-violet-500 border-violet-500/20",
};

type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
type ReviewableOrder = {
  id?: string;
  invoiceNumber?: string | null;
  invoiceSequence?: number | null;
  orderNumber?: string | null;
  paymentMethod?: string | null;
  status?: string | null;
};

const getDisplayOrderNumber = (order: ReviewableOrder) =>
  order?.invoiceNumber ||
  (order?.invoiceSequence ? String(order.invoiceSequence).padStart(2, "0") : "") ||
  order?.orderNumber ||
  order?.id?.slice(-8).toUpperCase();

const getOrderStatus = (order: ReviewableOrder) => String(order?.status || "").toLowerCase();
const isCodOrder = (order: ReviewableOrder) => String(order?.paymentMethod || "").toLowerCase() === "cod";
const canReviewOrder = (order: ReviewableOrder) => getOrderStatus(order) === "pending" && isCodOrder(order);
const getDisplayRazorpayMethod = (method?: string | null) => {
  const value = String(method || "").trim();
  return value && value.toLowerCase() !== "unknown" ? value : "";
};

export function OrdersTab() {
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [orderToShip, setOrderToShip] = useState<any>(null);
  const [addOrderOpen, setAddOrderOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date-desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const router = useRouter();

  // Fetch with a generous limit so search/filter works client-side
  const { data, isLoading, error } = useOrders({ limit: 500 });
  const confirmMutation = useConfirmOrder();
  const rejectMutation = useRejectOrder();
  const deleteMutation = useDeleteOrder();
  const syncOrdersMutation = useSyncOrdersToSheet();

  const [confirmAction, setConfirmAction] = useState<{
    type: "confirm" | "reject" | "delete";
    order: any;
  } | null>(null);

  const [bulkAction, setBulkAction] = useState<{
    type: "confirm" | "reject" | "delete";
    ids: string[];
  } | null>(null);

  // Only meaningful for type === "delete"; reset whenever a new delete
  // confirmation is opened so a previous choice never silently carries over.
  const [removeFromSheet, setRemoveFromSheet] = useState(false);

  const allOrders = (data as any)?.items || [];

  const processedOrders = useMemo(() => {
    let list = [...allOrders];

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((o) => o.status?.toLowerCase() === statusFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((o) => {
        const address = o.shippingAddress;
        const profile = o.user?.profiles?.[0];
        const name = address?.firstName
          ? `${address.firstName} ${address.lastName || ""}`.trim()
          : profile
            ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
            : "";
        return (
          o.id?.toLowerCase().includes(q) ||
          o.id?.slice(-8).toLowerCase().includes(q) ||
          o.invoiceNumber?.toLowerCase().includes(q) ||
          getDisplayOrderNumber(o)?.toLowerCase().includes(q) ||
          name.toLowerCase().includes(q) ||
          o.user?.email?.toLowerCase().includes(q) ||
          o.status?.toLowerCase().includes(q) ||
          o.paymentMethod?.toLowerCase().includes(q)
        );
      });
    }

    // Sort
    switch (sortKey) {
      case "date-desc":
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "date-asc":
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "amount-desc":
        list.sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));
        break;
      case "amount-asc":
        list.sort((a, b) => (a.totalAmount || 0) - (b.totalAmount || 0));
        break;
    }

    return list;
  }, [allOrders, searchQuery, statusFilter, sortKey]);

  const handleConfirm = (order: any) => setConfirmAction({ type: "confirm", order });
  const handleReject = (order: any) => setConfirmAction({ type: "reject", order });
  const handleDelete = (order: any) => {
    setRemoveFromSheet(false);
    setConfirmAction({ type: "delete", order });
  };

  const executeAction = () => {
    if (!confirmAction) return;
    const { type, order } = confirmAction;
    if (type === "confirm") confirmMutation.mutate(order.id);
    else if (type === "reject") rejectMutation.mutate({ id: order.id, reason: "Rejected by admin" });
    else if (type === "delete") deleteMutation.mutate({ id: order.id, removeFromSheet });
    setConfirmAction(null);
  };

  const executeBulkAction = () => {
    if (!bulkAction) return;
    const { type, ids } = bulkAction;
    ids.forEach((id) => {
      if (type === "confirm") confirmMutation.mutate(id);
      else if (type === "reject") rejectMutation.mutate({ id, reason: "Rejected by admin" });
      else if (type === "delete") deleteMutation.mutate({ id, removeFromSheet });
    });
    setSelectedIds(new Set());
    setBulkAction(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === processedOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processedOrders.map((o: any) => o.id)));
    }
  };

  const handleShip = (order: any) => {
    setOrderToShip(order);
    setShipDialogOpen(true);
  };

  const isSelectionMode = selectedIds.size > 0;

  const handleOrderRowClick = (order: any) => {
    if (isSelectionMode) {
      toggleSelect(order.id);
      return;
    }

    router.push(`/orders/${order.id}`);
  };

  const columns = [
    {
      header: () => (
        <Checkbox
          checked={processedOrders.length > 0 && selectedIds.size === processedOrders.length}
          onCheckedChange={toggleSelectAll}
          aria-label="Select all"
        />
      ),
      cell: (order: any) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedIds.has(order.id)}
            onCheckedChange={() => toggleSelect(order.id)}
            aria-label={`Select order ${getDisplayOrderNumber(order)}`}
          />
        </div>
      ),
      className: "w-[40px]",
    },
    {
      header: "Order Number",
      cell: (order: any) =>
        isSelectionMode ? (
          <span className="font-mono text-xs text-primary">
            {getDisplayOrderNumber(order)}
          </span>
        ) : (
          <Link
            href={`/orders/${order.id}`}
            className="font-mono text-xs hover:underline text-primary"
          >
            {getDisplayOrderNumber(order)}
          </Link>
        ),
    },
    {
      header: "Customer",
      cell: (order: any) => {
        const address = order.shippingAddress;
        const profile = order.user?.profiles?.[0];
        const rawName = address?.firstName
          ? `${address.firstName} ${address.lastName || ""}`.trim()
          : profile
            ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
            : "";
        return (
          <div>
            <div className="font-medium">{formatName(rawName)}</div>
            <div className="text-sm text-muted-foreground">
              {order.user?.email || "N/A"}
            </div>
          </div>
        );
      },
    },
    {
      header: "Date",
      cell: (order: any) => (
        <div>
          <div className="text-sm">{format(new Date(order.createdAt), "MMM dd, yyyy")}</div>
          <div className="text-xs text-muted-foreground">{format(new Date(order.createdAt), "HH:mm")}</div>
        </div>
      ),
    },
    {
      header: "Payment",
      cell: (order: any) => {
        const razorpayMethod = getDisplayRazorpayMethod(order.razorpayMethod);

        return (
          <div>
            <div className="text-sm font-medium">{order.paymentMethod || "N/A"}</div>
            {razorpayMethod && (
              <div className="text-xs text-muted-foreground capitalize">{razorpayMethod}</div>
            )}
          </div>
        );
      },
    },
    {
      header: "Total",
      cell: (order: any) => (
        <div className="font-bold">₹{order.totalAmount?.toFixed(2) || "0.00"}</div>
      ),
    },
    {
      header: "Status",
      cell: (order: any) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant="outline"
            className={cn(statusColors[order.status as keyof typeof statusColors] || "")}
          >
            {order.status}
          </Badge>
          {order.isManualOrder && (
            <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-500/20 text-[10px]">
              Offline
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: "Actions",
      cell: (order: any) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" asChild className="h-8 w-8 p-0">
            <Link href={`/orders/${order.id}`} title="View Details">
              <Eye className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-1">
            {canReviewOrder(order) && (
              <Button
                size="sm" variant="ghost"
                className="text-green-600 hover:text-green-700 h-8 w-8 p-0"
                onClick={() => handleConfirm(order)} title="Accept Order"
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
            )}
            {canReviewOrder(order) && (
              <Button
                size="sm" variant="ghost"
                className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                onClick={() => handleReject(order)} title="Reject Order"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            )}
            {getOrderStatus(order) === "processing" && (
              <Button
                size="sm" variant="ghost"
                className="text-blue-600 hover:text-blue-700 h-8 w-8 p-0"
                onClick={() => handleShip(order)} title="Ship Order"
              >
                <Truck className="w-4 h-4" />
              </Button>
            )}
            {(getOrderStatus(order) === "cancelled" || getOrderStatus(order) === "rejected") && (
              <Button
                size="sm" variant="ghost"
                className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                onClick={() => handleDelete(order)} title="Delete Order"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      ),
    },
  ];

  const toolbar = (
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by order ID, customer, email..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="confirmed">Confirmed</SelectItem>
          <SelectItem value="processing">Processing</SelectItem>
          <SelectItem value="shipped">Shipped</SelectItem>
          <SelectItem value="out_for_delivery">Out For Delivery</SelectItem>
          <SelectItem value="delivered">Delivered</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
        <SelectTrigger className="w-[155px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date-desc">Newest first</SelectItem>
          <SelectItem value="date-asc">Oldest first</SelectItem>
          <SelectItem value="amount-desc">Highest amount</SelectItem>
          <SelectItem value="amount-asc">Lowest amount</SelectItem>
        </SelectContent>
      </Select>
      {(searchQuery || statusFilter !== "all") && (
        <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>
          Clear
        </Button>
      )}
      <span className="text-sm text-muted-foreground self-center ml-auto whitespace-nowrap">
        {processedOrders.length} of {allOrders.length}
      </span>
      <Button size="sm" onClick={() => setAddOrderOpen(true)}>
        <Plus className="w-4 h-4 mr-1" />
        Add Order
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden md:block">
        {toolbar}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mb-3 p-2 bg-muted rounded-lg">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button
              size="sm" variant="outline"
              className="text-blue-600 border-blue-600"
              disabled={syncOrdersMutation.isPending}
              onClick={() =>
                syncOrdersMutation.mutate([...selectedIds], {
                  onSuccess: () => setSelectedIds(new Set()),
                })
              }
            >
              <FileSpreadsheet className="w-3 h-3 mr-1" />
              {syncOrdersMutation.isPending ? "Adding..." : `Add to Sheet (${selectedIds.size})`}
            </Button>
            <Button
              size="sm" variant="outline"
              className="text-green-600 border-green-600"
              onClick={() => {
                const pendingIds = [...selectedIds].filter((id) =>
                  allOrders.find((o: any) => o.id === id && canReviewOrder(o))
                );
                if (pendingIds.length) setBulkAction({ type: "confirm", ids: pendingIds });
              }}
            >
              <CheckCircle className="w-3 h-3 mr-1" />Accept ({[...selectedIds].filter((id) => allOrders.find((o: any) => o.id === id && canReviewOrder(o))).length})
            </Button>
            <Button
              size="sm" variant="outline"
              className="text-orange-600 border-orange-600"
              onClick={() => {
                const rejectableIds = [...selectedIds].filter((id) =>
                  allOrders.find((o: any) => o.id === id && canReviewOrder(o))
                );
                if (rejectableIds.length) setBulkAction({ type: "reject", ids: rejectableIds });
              }}
            >
              <XCircle className="w-3 h-3 mr-1" />Reject ({[...selectedIds].filter((id) => allOrders.find((o: any) => o.id === id && canReviewOrder(o))).length})
            </Button>
            <Button
              size="sm" variant="outline"
              className="text-red-600 border-red-600"
              onClick={() => {
                const deletableIds = [...selectedIds].filter((id) =>
                  allOrders.find((o: any) => o.id === id && (getOrderStatus(o) === "cancelled" || getOrderStatus(o) === "rejected"))
                );
                if (deletableIds.length) {
                  setRemoveFromSheet(false);
                  setBulkAction({ type: "delete", ids: deletableIds });
                }
              }}
            >
              <Trash2 className="w-3 h-3 mr-1" />Delete ({[...selectedIds].filter((id) => allOrders.find((o: any) => o.id === id && (getOrderStatus(o) === "cancelled" || getOrderStatus(o) === "rejected"))).length})
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        )}
        <div className="border rounded-lg overflow-x-auto">
          <DataTable
            title="Active Orders"
            data={processedOrders}
            columns={columns}
            isLoading={isLoading}
            error={error}
            emptyMessage={searchQuery || statusFilter !== "all" ? "No orders match your filters" : "No orders found"}
            getRowKey={(order: any) => order.id}
            onRowClick={handleOrderRowClick}
          />
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {toolbar}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">Error loading orders</div>
        ) : processedOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery || statusFilter !== "all" ? "No orders match your filters" : "No orders found"}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {processedOrders.map((order: any) => {
              const address = order.shippingAddress;
              const profile = order.user?.profiles?.[0];
              const rawName = address?.firstName
                ? `${address.firstName} ${address.lastName || ""}`.trim()
                : profile
                  ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
                  : "";
              return (
                <Card key={order.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Link href={`/orders/${order.id}`} className="font-mono text-sm font-semibold hover:text-primary">
                        {getDisplayOrderNumber(order)}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(order.createdAt), "MMM dd, yyyy HH:mm")}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", statusColors[order.status as keyof typeof statusColors] || "")}
                    >
                      {order.status}
                    </Badge>
                    {order.isManualOrder && (
                      <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-500/20 text-[10px]">
                        Offline
                      </Badge>
                    )}
                  </div>
                  <div className="mb-3 pb-3 border-b">
                    <p className="text-sm font-medium">{formatName(rawName)}</p>
                    <p className="text-xs text-muted-foreground">{order.user?.email || "N/A"}</p>
                  </div>
                  <div className="space-y-2 mb-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment:</span>
                      <span className="font-medium">{order.paymentMethod || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-bold">₹{order.totalAmount?.toFixed(2) || "0.00"}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-3 border-t flex-wrap">
                    <Button size="sm" variant="ghost" asChild className="flex-1 text-xs">
                      <Link href={`/orders/${order.id}`}><Eye className="w-3 h-3 mr-1" />View</Link>
                    </Button>
                    {canReviewOrder(order) && (
                      <Button size="sm" variant="ghost" className="flex-1 text-xs text-green-600" onClick={() => handleConfirm(order)}>
                        <CheckCircle className="w-3 h-3 mr-1" />Accept
                      </Button>
                    )}
                    {canReviewOrder(order) && (
                      <Button size="sm" variant="ghost" className="flex-1 text-xs text-red-600" onClick={() => handleReject(order)}>
                        <XCircle className="w-3 h-3 mr-1" />Reject
                      </Button>
                    )}
                    {getOrderStatus(order) === "processing" && (
                      <Button size="sm" variant="ghost" className="flex-1 text-xs text-blue-600" onClick={() => handleShip(order)}>
                        <Truck className="w-3 h-3 mr-1" />Ship
                      </Button>
                    )}
                    {(getOrderStatus(order) === "cancelled" || getOrderStatus(order) === "rejected") && (
                      <Button size="sm" variant="ghost" className="flex-1 text-xs text-red-600" onClick={() => handleDelete(order)}>
                        <Trash2 className="w-3 h-3 mr-1" />Delete
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {orderToShip && (
        <ShipOrderDialog
          order={orderToShip}
          open={shipDialogOpen}
          onClose={() => { setShipDialogOpen(false); setOrderToShip(null); }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            setShipDialogOpen(false);
            setOrderToShip(null);
          }}
        />
      )}

      <AddManualOrderDialog
        open={addOrderOpen}
        onOpenChange={setAddOrderOpen}
      />

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "confirm" && "Accept Order"}
              {confirmAction?.type === "reject" && "Reject Order"}
              {confirmAction?.type === "delete" && "Delete Order"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "confirm" && `Accept order ${getDisplayOrderNumber(confirmAction.order)}?`}
              {confirmAction?.type === "reject" && `Reject order ${getDisplayOrderNumber(confirmAction.order)}? This marks it as rejected.`}
              {confirmAction?.type === "delete" && `Permanently delete order ${getDisplayOrderNumber(confirmAction.order)}? This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmAction?.type === "delete" && (
            <div className="flex items-center gap-2 py-2">
              <Checkbox
                id="remove-from-sheet-single"
                checked={removeFromSheet}
                onCheckedChange={(checked) => setRemoveFromSheet(checked === true)}
              />
              <Label htmlFor="remove-from-sheet-single" className="text-sm font-normal">
                Also remove this order&apos;s row from Google Sheets
              </Label>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeAction}
              className={cn(
                confirmAction?.type === "delete" || confirmAction?.type === "reject"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "",
              )}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!bulkAction} onOpenChange={(open) => !open && setBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction?.type === "confirm" && "Accept Multiple Orders"}
              {bulkAction?.type === "reject" && "Reject Multiple Orders"}
              {bulkAction?.type === "delete" && "Delete Multiple Orders"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction?.type === "confirm" && `Accept ${bulkAction.ids.length} order(s)?`}
              {bulkAction?.type === "reject" && `Reject ${bulkAction?.ids.length} order(s)? They will be marked as rejected.`}
              {bulkAction?.type === "delete" && `Permanently delete ${bulkAction?.ids.length} order(s)? This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {bulkAction?.type === "delete" && (
            <div className="flex items-center gap-2 py-2">
              <Checkbox
                id="remove-from-sheet-bulk"
                checked={removeFromSheet}
                onCheckedChange={(checked) => setRemoveFromSheet(checked === true)}
              />
              <Label htmlFor="remove-from-sheet-bulk" className="text-sm font-normal">
                Also remove these orders&apos; rows from Google Sheets
              </Label>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkAction}
              className={cn(
                bulkAction?.type === "delete" || bulkAction?.type === "reject"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "",
              )}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ordersService } from "@/services";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { CourierSelect } from "./courier-select";

interface ShipOrderDialogProps {
  order: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ShipOrderDialog({
  order,
  open,
  onClose,
  onSuccess,
}: ShipOrderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    trackingNumber: order.trackingNumber || "",
    courierName: order.courierName || "",
    estimatedDelivery: order.estimatedDelivery
      ? new Date(order.estimatedDelivery).toISOString().split("T")[0]
      : "",
  });
  const [showConfirmation, setShowConfirmation] = useState(false);

  const api = useAxiosAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.trackingNumber) {
      toast.error("Please enter tracking number");
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmShip = async () => {
    setLoading(true);
    try {
      await ordersService(api).ship(order.id, formData);
      toast.success("Order shipped successfully!");
      setShowConfirmation(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to ship order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ship Order</DialogTitle>
          <DialogDescription>
            Enter tracking details to mark this order as shipped.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="trackingNumber">Tracking Number *</Label>
            <Input
              id="trackingNumber"
              placeholder="Enter tracking/AWB number"
              value={formData.trackingNumber}
              onChange={(e) =>
                setFormData({ ...formData, trackingNumber: e.target.value })
              }
              required
            />
          </div>

          <div>
            <Label htmlFor="courierName">Courier Name</Label>
            <CourierSelect
              value={formData.courierName}
              onValueChange={(value) =>
                setFormData({ ...formData, courierName: value })
              }
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="estimatedDelivery">
              Estimated Delivery (Optional)
            </Label>
            <Input
              id="estimatedDelivery"
              type="date"
              value={formData.estimatedDelivery}
              onChange={(e) =>
                setFormData({ ...formData, estimatedDelivery: e.target.value })
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Ship Order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. You are about to ship this order via{" "}
              <span className="font-medium text-foreground">
                {formData.courierName}
              </span>{" "}
              with tracking number{" "}
              <span className="font-medium text-foreground">
                {formData.trackingNumber}
              </span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmShip} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Shipment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

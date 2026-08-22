"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApprovedUnshippedOrders, useShipOrder } from "@/hooks/use-orders";
import { CourierSelect } from "@/components/orders/courier-select";
import { formatName } from "@/lib/utils";

const formSchema = z.object({
  orderId: z.string().min(1, "Please select an order"),
  trackingNumber: z.string().min(1, "Tracking number is required"),
  courierName: z.string(),
  estimatedDelivery: z.string().optional(),
});

const getDisplayOrderNumber = (order: any) =>
  order?.orderNumber ||
  order?.invoiceNumber ||
  (order?.invoiceSequence ? String(order.invoiceSequence).padStart(2, "0") : "") ||
  order?.id?.slice(-8).toUpperCase();

type FormValues = z.infer<typeof formSchema>;

export default function NewShipmentPage() {
  const router = useRouter();
  const { data: orders = [], isLoading: fetchingOrders } =
    useApprovedUnshippedOrders();
  const { mutate: shipOrder, isPending: loading } = useShipOrder();

  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderId: "",
      trackingNumber: "",
      courierName: "",
      estimatedDelivery: "",
    },
  });

  const handleOrderSelect = (orderId: string) => {
    const orderList = Array.isArray(orders) ? orders : [];
    const order = orderList.find((o: any) => o.id === orderId);

    if (order) {
      setSelectedOrder(order);
      form.setValue("orderId", orderId);

      if (order.trackingNumber) {
        form.setValue("trackingNumber", order.trackingNumber);
      }
    }
  };

  const onSubmit = (values: FormValues) => {
    shipOrder(
      {
        id: values.orderId,
        trackingData: {
          trackingNumber: values.trackingNumber,
          courierName: values.courierName,
          estimatedDelivery: values.estimatedDelivery,
        },
      },
      {
        onSuccess: () => {
          router.push("/logistics/delivery");
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/logistics/delivery">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Shipment</h1>
          <p className="text-muted-foreground">
            Ship an approved order via your preferred courier
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Shipment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField<FormValues>
                  control={form.control}
                  name="orderId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Order</FormLabel>
                      <Select
                        onValueChange={handleOrderSelect}
                        value={field.value}
                        disabled={fetchingOrders}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                fetchingOrders
                                  ? "Loading orders..."
                                  : "Select an approved order"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.isArray(orders) &&
                            orders.map((order: any) => (
                              <SelectItem key={order.id} value={order.id}>
                                Order {getDisplayOrderNumber(order)} - ₹
                                {order.totalAmount}
                              </SelectItem>
                            ))}
                          {Array.isArray(orders) &&
                            orders.length === 0 &&
                            !fetchingOrders && (
                              <SelectItem value="none" disabled>
                                No approved orders found
                              </SelectItem>
                            )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Only 'Processing' (Approved) orders appear here.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField<FormValues>
                  control={form.control}
                  name="courierName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Courier</FormLabel>
                      <FormControl>
                        <CourierSelect
                          value={field.value ?? ""}
                          onValueChange={field.onChange}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField<FormValues>
                  control={form.control}
                  name="trackingNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tracking / Waybill Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter Tracking/Waybill Number"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField<FormValues>
                  control={form.control}
                  name="estimatedDelivery"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Delivery Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={loading || !selectedOrder}>
                    {loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Confirm Shipment
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedOrder ? (
              <div className="space-y-4">
                <div className="border p-4 rounded-md bg-muted/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">
                      Order {getDisplayOrderNumber(selectedOrder)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(selectedOrder.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Customer:</strong>{" "}
                      {formatName(
                        `${selectedOrder.shippingAddress?.firstName} ${selectedOrder.shippingAddress?.lastName || ""}`.trim(),
                      )}
                    </p>
                    <p>
                      <strong>Email:</strong>{" "}
                      {selectedOrder.shippingAddress?.email ||
                        selectedOrder.user?.email}
                    </p>
                    <p>
                      <strong>Phone:</strong>{" "}
                      {selectedOrder.shippingAddress?.contactNo}
                    </p>
                    <div className="mt-2 pt-2 border-t">
                      <p className="font-medium">Shipping Address:</p>
                      <p>{selectedOrder.shippingAddress?.address}</p>
                      <p>
                        {selectedOrder.shippingAddress?.city},{" "}
                        {selectedOrder.shippingAddress?.state}
                      </p>
                      <p>
                        {selectedOrder.shippingAddress?.postalCode},{" "}
                        {selectedOrder.shippingAddress?.country}
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Items</h4>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex justify-between text-sm"
                      >
                        <span>
                          {item.product?.name} x {item.quantity}
                        </span>
                        <span>₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                      <span>Total</span>
                      <span>₹{selectedOrder.totalAmount}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground min-h-[300px]">
                <Check className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">No Order Selected</p>
                <p className="text-sm mt-2">
                  Please select an order from the dropdown above to view details
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, Search, Loader2, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { ordersService } from "@/services/orders.service";
import { productsService } from "@/services/products.service";
import { customersService } from "@/services/customers.service";
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { useAdminQuery } from "@/hooks/use-admin-query";

const ORDER_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_MODES = [
  { value: "COD", label: "Cash on Delivery" },
  { value: "UPI", label: "UPI" },
  { value: "Razorpay", label: "Online (Razorpay)" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Other", label: "Other" },
];

const PAYMENT_STATUSES = [
  { value: "Paid", label: "Paid" },
  { value: "Pending", label: "Pending" },
  { value: "COD", label: "COD" },
  { value: "Partial", label: "Partial" },
];

interface OrderItem {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  price: number;
}

interface AddManualOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddManualOrderDialog({ open, onOpenChange }: AddManualOrderDialogProps) {
  const api = useAxiosAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [customerName, setCustomerName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("confirmed");
  const [paymentMode, setPaymentMode] = useState("COD");
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [orderDate, setOrderDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [orderNote, setOrderNote] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);

  // Product search
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearch = useDebounce(productSearch, 300);

  // Customer search/autocomplete
  const { data: allCustomers = [] } = useAdminQuery(["customers"], () =>
    customersService(api).getAll()
  );
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const filteredCustomers = customerName.length >= 2
    ? allCustomers.filter((c: any) =>
        c.name?.toLowerCase().includes(customerName.toLowerCase()) ||
        c.email?.toLowerCase().includes(customerName.toLowerCase()) ||
        c.phone?.includes(customerName)
      ).slice(0, 6)
    : [];

  const selectCustomer = (customer: any) => {
    setCustomerName(customer.name || "");
    if (customer.phone) setContact(customer.phone);
    if (customer.email) setEmail(customer.email);
    if (customer.city) setCity(customer.city);
    setShowCustomerDropdown(false);
  };

  // Search products when query changes
  const handleSearchProducts = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const result = await productsService(api).search(query);
      setSearchResults(result?.data || result || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Trigger search on debounced value
  useState(() => {
    if (debouncedSearch) handleSearchProducts(debouncedSearch);
    else setSearchResults([]);
  });

  const addProductItem = (product: any) => {
    const existing = items.find((i) => i.productId === product.id);
    if (existing) {
      setItems(items.map((i) =>
        i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setItems([
        ...items,
        {
          id: Math.random().toString(36).slice(2, 9),
          productId: product.id,
          productName: product.name || product.title,
          quantity: 1,
          price: product.price || 0,
        },
      ]);
    }
    setProductSearch("");
    setSearchResults([]);
  };

  const addCustomItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).slice(2, 9),
        productName: "",
        quantity: 1,
        price: 0,
      },
    ]);
  };

  const updateItem = (id: string, field: keyof OrderItem, value: any) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const resetForm = () => {
    setCustomerName("");
    setContact("");
    setEmail("");
    setCity("");
    setStatus("confirmed");
    setPaymentMode("COD");
    setPaymentStatus("Pending");
    setOrderDate(new Date().toISOString().split("T")[0]);
    setOrderNote("");
    setItems([]);
    setProductSearch("");
    setSearchResults([]);
  };

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!contact.trim()) {
      toast.error("Contact number is required");
      return;
    }
    if (!city.trim()) {
      toast.error("City is required");
      return;
    }
    if (items.length === 0) {
      toast.error("Add at least one product");
      return;
    }
    if (items.some((i) => !i.productName.trim())) {
      toast.error("All items must have a product name");
      return;
    }

    setIsSubmitting(true);
    try {
      await ordersService(api).createManualOrder({
        customerName: customerName.trim(),
        contact: contact.trim(),
        email: email.trim() || undefined,
        city: city.trim(),
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          price: i.price,
        })),
        totalAmount,
        status,
        paymentMode,
        paymentStatus,
        orderDate,
        orderNote: orderNote.trim() || undefined,
      });

      toast.success("Order created successfully");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to create order", {
        description: error?.response?.data?.message || error?.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[780px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Offline Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 relative">
              <Label>Customer Name *</Label>
              <Input
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                placeholder="Full name"
                autoComplete="off"
              />
              {showCustomerDropdown && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 border rounded-md bg-popover shadow-md max-h-40 overflow-y-auto">
                  {filteredCustomers.map((customer: any) => (
                    <button
                      key={customer.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectCustomer(customer)}
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between items-center"
                    >
                      <div>
                        <span className="font-medium">{customer.name}</span>
                        {customer.email && (
                          <span className="text-muted-foreground ml-2 text-xs">{customer.email}</span>
                        )}
                      </div>
                      {customer.phone && (
                        <span className="text-xs text-muted-foreground">{customer.phone}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Contact *</Label>
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Phone number"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                type="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label>City *</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Order Date</Label>
              <Input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-2">
            <Label>Products *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  handleSearchProducts(e.target.value);
                }}
                placeholder="Search products to add..."
                className="pl-9"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <div className="border rounded-md max-h-40 overflow-y-auto bg-popover shadow-md">
                {searchResults.slice(0, 8).map((product: any) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProductItem(product)}
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between items-center"
                  >
                    <span className="truncate">{product.name || product.title}</span>
                    <span className="text-muted-foreground ml-2 flex-shrink-0">
                      ₹{product.price}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Added items */}
            {items.length > 0 && (
              <div className="space-y-3 border rounded-md p-3">
                {items.map((item) => (
                  <div key={item.id} className="space-y-2 pb-3 border-b last:border-0 last:pb-0">
                    {/* Row 1: Product name + remove */}
                    <div className="flex items-center gap-2">
                      <Input
                        value={item.productName}
                        onChange={(e) => updateItem(item.id, "productName", e.target.value)}
                        placeholder="Product name"
                        className="flex-1 h-8 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-destructive/70 hover:text-destructive p-1 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {/* Row 2: Quantity with +/- and price */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateItem(item.id, "quantity", Math.max(1, item.quantity - 1))}
                          className="h-7 w-7 rounded border border-input flex items-center justify-center hover:bg-muted"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateItem(item.id, "quantity", item.quantity + 1)}
                          className="h-7 w-7 rounded border border-input flex items-center justify-center hover:bg-muted"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1 flex-1">
                        <span className="text-sm text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateItem(item.id, "price", parseFloat(e.target.value) || 0)}
                          className="h-7 text-sm flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          min={0}
                          step={0.01}
                          placeholder="Price"
                        />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                        = ₹{(item.price * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addCustomItem}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Custom item
                  </Button>
                  <span className="text-sm font-medium">
                    Total: ₹{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {items.length === 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomItem}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add custom item
              </Button>
            )}
          </div>

          {/* Status & Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUSES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label>Order Note (optional)</Label>
            <Input
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              placeholder="Any notes about this order..."
            />
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

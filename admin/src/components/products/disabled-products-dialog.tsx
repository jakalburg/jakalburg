"use client";

import { useEffect, useState } from "react";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Power } from "lucide-react";
import { useProducts } from "@/hooks/use-products";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { productsService } from "@/services/products.service";
import { Product } from "@/types/product";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface DisabledProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DisabledProductsDialog({
  open,
  onOpenChange,
}: DisabledProductsDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isEnabling, setIsEnabling] = useState(false);

  const { data, isLoading } = useProducts({
    page: 1,
    limit: 200,
    status: "disabled",
  });
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();

  const products: Product[] = data?.data ?? [];

  // Reset selection whenever the dialog is (re)opened
  useEffect(() => {
    if (open) setSelectedIds(new Set());
  }, [open]);

  const allSelected =
    products.length > 0 && products.every((p) => selectedIds.has(p.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEnableSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setIsEnabling(true);
    try {
      const result = await productsService(axiosAuth).bulkUpdateStatus(
        ids,
        true,
      );
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(
        `${result.updated} product${result.updated === 1 ? "" : "s"} enabled`,
      );
      if (ids.length >= products.length) {
        onOpenChange(false);
      }
    } catch (error: any) {
      toast.error("Failed to enable products", {
        description: error.response?.data?.message || error.message,
      });
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Disabled Products</DialogTitle>
          <DialogDescription>
            These products are hidden from the customer website. Select the
            ones you want to bring back and enable them.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No disabled products.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b pb-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all disabled products"
              />
              <span className="text-sm text-muted-foreground">
                {selectedIds.size > 0
                  ? `${selectedIds.size} selected`
                  : `Select all (${products.length})`}
              </span>
            </div>
            <ScrollArea className="h-[320px] pr-4">
              <div className="space-y-1">
                {products.map((product) => {
                  const media = product.media || [];
                  const primaryMedia =
                    media.find((m) => m.mediaType === "image") || media[0];
                  const imageUrl =
                    product.thumbnail || product.img || primaryMedia?.publicUrl;

                  return (
                    <label
                      key={product.id}
                      className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedIds.has(product.id)}
                        onCheckedChange={() => toggleOne(product.id)}
                        aria-label={`Select ${product.name}`}
                      />
                      <ImageShimmer
                        src={imageUrl}
                        alt={product.name}
                        wrapperClassName="w-10 h-10 rounded-md flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">
                          {product.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {typeof product.category === "string"
                            ? product.category
                            : product.category?.name || "N/A"}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleEnableSelected}
            disabled={selectedIds.size === 0 || isEnabling}
            className="gap-2"
          >
            {isEnabling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Power className="w-4 h-4" />
            )}
            Enable Selected
            {selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

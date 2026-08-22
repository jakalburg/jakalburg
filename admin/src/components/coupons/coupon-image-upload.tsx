"use client";

import { useState, useCallback } from "react";
import { X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { toast } from "sonner";

interface CouponImageUploadProps {
  previewUrl: string;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

export function CouponImageUpload({
  previewUrl,
  onFileSelect,
  disabled,
}: CouponImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const file = files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (!disabled) {
        handleFileSelect(e.dataTransfer.files);
      }
    },
    [handleFileSelect, disabled],
  );

  const handleRemove = () => {
    onFileSelect(null);
  };

  return (
    <div className="space-y-4">
      {!previewUrl ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200",
            dragOver ? "border-primary bg-primary/5" : "border-border",
            disabled && "opacity-50 pointer-events-none",
          )}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">
            Drag and drop coupon image here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Recommended: 400x400px, PNG or JPG
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            id="coupon-image-upload"
            disabled={disabled}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              document.getElementById("coupon-image-upload")?.click()
            }
            disabled={disabled}
          >
            Select Image
          </Button>
        </div>
      ) : (
        <div className="relative group rounded-lg overflow-hidden border-2 border-border w-48">
          <ImageShimmer
            src={previewUrl}
            alt="Coupon"
            wrapperClassName="aspect-square"
          />
          {!disabled && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <Button
                type="button"
                size="icon"
                variant="destructive"
                onClick={handleRemove}
                className="w-8 h-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

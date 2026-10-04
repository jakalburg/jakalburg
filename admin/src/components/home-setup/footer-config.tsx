"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/products/image-upload";
import { uploadSingleImage } from "@/services/uploads.service";
import { toast } from "sonner";

type ImageItem = {
  id: string;
  url: string;
  file?: File;
  isPrimary: boolean;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionData: any;
  onSave: (data: any) => Promise<void>;
}

const toImageItem = (id: string, url?: string): ImageItem[] =>
  url
    ? [
        {
          id,
          url,
          isPrimary: true,
        },
      ]
    : [];

const DEFAULT_IMAGE_OPACITY = 34;

/**
 * The storefront footer's own background (`--background` in the client's
 * index.css). The preview veils the image with THIS, not white — the veil has
 * to be the colour the image is actually sitting on, or the preview lies about
 * how washed out the result looks.
 */
const STOREFRONT_BG = "oklch(0.98 0.008 90)";

const getOpacity = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : DEFAULT_IMAGE_OPACITY;

const getOverlayOpacity = (imageOpacity: number) =>
  Math.min(1, Math.max(0, 1 - imageOpacity / 100));

export function FooterConfigModal({
  open,
  onOpenChange,
  sectionData,
  onSave,
}: Props) {
  const [desktopImages, setDesktopImages] = useState<ImageItem[]>([]);
  const [mobileImages, setMobileImages] = useState<ImageItem[]>([]);
  const [desktopOpacity, setDesktopOpacity] = useState(DEFAULT_IMAGE_OPACITY);
  const [mobileOpacity, setMobileOpacity] = useState(DEFAULT_IMAGE_OPACITY);
  const [separateMobileOpacity, setSeparateMobileOpacity] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const normalizedData = useMemo(() => {
    if (Array.isArray(sectionData)) return sectionData[0] || {};
    return sectionData || {};
  }, [sectionData]);

  useEffect(() => {
    if (!open) return;
    setDesktopImages(toImageItem("footer-desktop", normalizedData.desktopImage));
    setMobileImages(toImageItem("footer-mobile", normalizedData.mobileImage));
    const savedDesktopOpacity = getOpacity(normalizedData.desktopImageOpacity);
    const savedSeparateMobileOpacity = Boolean(
      normalizedData.separateMobileOpacity,
    );
    setDesktopOpacity(savedDesktopOpacity);
    setMobileOpacity(
      savedSeparateMobileOpacity
        ? getOpacity(normalizedData.mobileImageOpacity)
        : savedDesktopOpacity,
    );
    setSeparateMobileOpacity(savedSeparateMobileOpacity);
  }, [
    open,
    normalizedData.desktopImage,
    normalizedData.mobileImage,
    normalizedData.desktopImageOpacity,
    normalizedData.mobileImageOpacity,
    normalizedData.separateMobileOpacity,
  ]);

  // A removed image must stay removed, so an empty list resolves to "". Only a
  // newly picked file costs an upload; a pasted or unchanged URL passes through.
  const resolveImageUrl = async (images: ImageItem[], fallback = "") => {
    const image = images[0];
    if (!image) return "";
    if (!image.file) return image.url || fallback;
    return uploadSingleImage(image.file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const desktopImage = await resolveImageUrl(
        desktopImages,
        normalizedData.desktopImage || "",
      );
      const mobileImage = await resolveImageUrl(
        mobileImages,
        normalizedData.mobileImage || "",
      );

      await onSave({
        desktopImage,
        mobileImage,
        desktopImageOpacity: desktopOpacity,
        mobileImageOpacity: separateMobileOpacity
          ? mobileOpacity
          : desktopOpacity,
        separateMobileOpacity,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save footer background images:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save footer background images",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const effectiveMobileOpacity = separateMobileOpacity
    ? mobileOpacity
    : desktopOpacity;

  const renderPreview = (
    label: string,
    imageUrl: string | undefined,
    opacity: number,
    className: string,
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-xs text-muted-foreground">{opacity}%</span>
      </div>
      <div
        className={`relative overflow-hidden rounded-md border shadow-sm ${className}`}
        style={{
          backgroundColor: STOREFRONT_BG,
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: STOREFRONT_BG,
            opacity: getOverlayOpacity(opacity),
          }}
        />
        {/* Mirrors the storefront footer's actual columns, so the preview
            shows roughly where the image will and won't be covered. */}
        <div className="relative z-10 h-full p-4">
          <div className="grid grid-cols-3 gap-4 text-[10px] uppercase tracking-wide text-neutral-900">
            <div>
              <div className="font-bold">Jakalburg</div>
              <div className="mt-2 normal-case text-neutral-700">
                Considered wardrobe essentials
              </div>
            </div>
            <div>
              <div className="font-bold">Shop</div>
              <div className="mt-2 normal-case text-neutral-700">
                New arrivals
              </div>
            </div>
            <div>
              <div className="font-bold">Help</div>
              <div className="mt-2 normal-case text-neutral-700">Contact</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Footer Background</DialogTitle>
          <DialogDescription>
            Upload separate background images for desktop and mobile footer
            views.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
          <div className="space-y-3">
            <Label>Desktop Footer Background</Label>
            <ImageUpload
              images={desktopImages}
              onChange={setDesktopImages}
              maxImages={1}
              replaceWhenFull
              showPrimary={false}
              objectFit="cover"
              inputId="footer-desktop-background-upload"
              uploadLabel="Upload desktop footer background"
            />
          </div>

          <div className="space-y-3">
            <Label>Mobile Footer Background</Label>
            <ImageUpload
              images={mobileImages}
              onChange={setMobileImages}
              maxImages={1}
              replaceWhenFull
              showPrimary={false}
              objectFit="cover"
              inputId="footer-mobile-background-upload"
              uploadLabel="Upload mobile footer background"
            />
          </div>
        </div>

        <div className="space-y-5 border-t pt-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Desktop Image Opacity</Label>
                <p className="text-xs text-muted-foreground">
                  Controls how strongly the footer background image appears.
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                {desktopOpacity}%
              </span>
            </div>
            <Slider
              value={[desktopOpacity]}
              min={0}
              max={100}
              step={1}
              onValueChange={(value) => {
                const nextOpacity = value[0] ?? DEFAULT_IMAGE_OPACITY;
                setDesktopOpacity(nextOpacity);
                if (!separateMobileOpacity) {
                  setMobileOpacity(nextOpacity);
                }
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <Label>Use Different Mobile Opacity</Label>
              <p className="text-xs text-muted-foreground">
                Turn on to set a separate opacity for mobile.
              </p>
            </div>
            <Switch
              checked={separateMobileOpacity}
              onCheckedChange={(checked) => {
                setSeparateMobileOpacity(checked);
                if (!checked) {
                  setMobileOpacity(desktopOpacity);
                }
              }}
            />
          </div>

          {separateMobileOpacity && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <Label>Mobile Image Opacity</Label>
                <span className="text-sm text-muted-foreground">
                  {mobileOpacity}%
                </span>
              </div>
              <Slider
                value={[mobileOpacity]}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) =>
                  setMobileOpacity(value[0] ?? DEFAULT_IMAGE_OPACITY)
                }
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px] gap-6 border-t pt-5">
          {renderPreview(
            "Desktop Live Preview",
            desktopImages[0]?.url || normalizedData.desktopImage,
            desktopOpacity,
            "h-44",
          )}
          {renderPreview(
            "Mobile Live Preview",
            mobileImages[0]?.url ||
              normalizedData.mobileImage ||
              desktopImages[0]?.url ||
              normalizedData.desktopImage,
            effectiveMobileOpacity,
            "h-72",
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Footer Background"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

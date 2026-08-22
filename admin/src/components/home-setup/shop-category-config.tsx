"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { uploadService } from "@/services/upload.service";
import { collectionsService } from "@/services/collections.service";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { toast } from "sonner";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { useQuery } from "@tanstack/react-query";
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

export interface ShopCategoryItem {
  id: string;
  image: string;
  imageFile?: File;
  subtitle: string;
  title: string;
  buttonText: string;
  link: string;
}

const getLinkParam = (link: string | undefined, key: string) => {
  if (!link) return "";

  const query = link.split("?")[1];
  if (!query) return "";

  return new URLSearchParams(query).get(key) || "";
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionData: any;
  onSave: (data: any) => Promise<void>;
}

export function ShopCategoryConfigModal({
  open,
  onOpenChange,
  sectionData,
  onSave,
}: Props) {
  const api = useAxiosAuth();
  const [items, setItems] = useState<ShopCategoryItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showExitPrompt, setShowExitPrompt] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadId = useRef<string | null>(null);

  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: () => collectionsService(api).getAll(),
  });

  // Enforce exactly 2 items
  useEffect(() => {
    if (open) {
      const initialData = Array.isArray(sectionData)
        ? sectionData.map((item, index) => ({
            ...item,
            id:
              item.id ||
              `shop-category-${index}-${Math.random()
                .toString(36)
                .substring(7)}`,
          }))
        : [];
      while (initialData.length < 2) {
        initialData.push({
          id: `shop-category-${initialData.length}-${Math.random()
            .toString(36)
            .substring(7)}`,
          image: "",
          subtitle: "Collection",
          title: "New Category",
          buttonText: "Shop Now",
          link: "/shop",
        });
      }
      // Slice to exactly 2
      setItems(initialData.slice(0, 2));
      setHasChanges(false);
    }
  }, [open, sectionData]);

  const handleChange = (
    id: string,
    field: keyof ShopCategoryItem,
    value: string,
  ) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
    setHasChanges(true);
  };

  const triggerUpload = (id: string) => {
    pendingUploadId.current = id;
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = pendingUploadId.current;
    if (!file || !targetId) return;

    // Store the file for upload at Save time, and show a local preview
    const previewUrl = URL.createObjectURL(file);
    setItems(
      items.map((item) =>
        item.id === targetId
          ? { ...item, image: previewUrl, imageFile: file }
          : item,
      ),
    );
    setHasChanges(true);
    pendingUploadId.current = null;
  };

  const validate = (): string | null => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.image) return `Banner ${i + 1} is missing a background image.`;
      if (!item.title.trim()) return `Banner ${i + 1} is missing a title.`;
    }
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setIsSaving(true);
    try {
      const { uploadImage, deleteUpload } = uploadService(api);

      // Collect all current URLs to see what might need deleting
      const initialUrls = Array.isArray(sectionData)
        ? sectionData.map((item: any) => item.image).filter(Boolean)
        : [];

      const processedItems = await Promise.all(
        items.map(async (item) => {
          let finalImage = item.image;

          if (item.imageFile) {
            const res = await uploadImage(item.imageFile);
            finalImage = res.url || res.publicUrl || res.fileUrl || "";
          }

          return {
            id: item.id,
            image: finalImage,
            subtitle: item.subtitle,
            title: item.title,
            buttonText: item.buttonText,
            link: item.link,
          };
        }),
      );

      // Cleanup: Delete URLs that were present initially but are no longer in the processed items
      const finalUrls = processedItems
        .map((item) => item.image)
        .filter(Boolean);
      const removedUrls = initialUrls.filter((url) => !finalUrls.includes(url));

      if (removedUrls.length > 0) {
        Promise.allSettled(removedUrls.map((url) => deleteUpload(url))).catch(
          (err) => console.error("Failed to cleanup old images:", err),
        );
      }

      await onSave(processedItems);
      setHasChanges(false);
      onOpenChange(false);
      toast.success("Categories configuration saved successfully");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(
        error?.response?.data?.message ||
          "Failed to upload images or save configuration",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && hasChanges) {
      setShowExitPrompt(true);
    } else {
      onOpenChange(newOpen);
      if (!newOpen) setHasChanges(false);
    }
  };

  const layoutLabels = ["Left Banner", "Right Banner"];

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[95vw] w-full max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shop By Collection Configuration</DialogTitle>
            <DialogDescription>
              Manage the 2 side-by-side collection banners shown in the Shop
              By Collection section. Each card shows a full image with a
              hover button and text below.
            </DialogDescription>
          </DialogHeader>

          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
          />

          <div className="space-y-6 py-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="relative p-6 border rounded-xl bg-card shadow-sm space-y-4"
              >
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  {layoutLabels[index] || `Banner ${index + 1}`}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Core Data */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Main Title</Label>
                      <p className="text-xs text-muted-foreground">
                        Tip: Use &lt;br /&gt; for line breaks
                      </p>
                      <Input
                        value={item.title}
                        onChange={(e) =>
                          handleChange(item.id, "title", e.target.value)
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Subtitle</Label>
                        <Input
                          value={item.subtitle}
                          onChange={(e) =>
                            handleChange(item.id, "subtitle", e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Collection</Label>
                      <p className="text-xs text-muted-foreground">
                        Products assigned to this collection in the product
                        form show up when a shopper clicks this banner.
                      </p>
                      <Select
                        value={getLinkParam(item.link, "collection") || "none"}
                        onValueChange={(collectionId) => {
                          const selectedCollection = collections.find(
                            (c: any) => c.id === collectionId,
                          );
                          const newItems = items.map((t) =>
                            t.id === item.id
                              ? {
                                  ...t,
                                  title: selectedCollection
                                    ? selectedCollection.name
                                    : t.title,
                                  link:
                                    collectionId && collectionId !== "none"
                                      ? `/shop?collection=${collectionId}`
                                      : "/shop",
                                }
                              : t,
                          );
                          setItems(newItems);
                          setHasChanges(true);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a collection..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {collections.map((collection: any) => (
                            <SelectItem key={collection.id} value={collection.id}>
                              {collection.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {collections.length === 0 && (
                        <p className="text-xs text-amber-600">
                          No collections yet — create one under Catalog →
                          Collections first.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Image Column */}
                  <div className="space-y-4 border-l pl-6">
                    <div className="space-y-2">
                      <Label className="text-base">Background Image</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Ensure high quality lifestyle or product photography.
                      </p>
                      <div className="flex items-center gap-3">
                        <Input
                          className="flex-1"
                          value={item.image}
                          onChange={(e) =>
                            handleChange(item.id, "image", e.target.value)
                          }
                          placeholder="https://..."
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="px-6 shrink-0"
                          onClick={() => triggerUpload(item.id)}
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Choose Image
                        </Button>
                      </div>
                      <ImageShimmer
                        src={item.image}
                        alt="Preview"
                        wrapperClassName="mt-3 h-32 w-full rounded-lg border shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showExitPrompt} onOpenChange={setShowExitPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close without
              saving? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowExitPrompt(false);
                setHasChanges(false);
                onOpenChange(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

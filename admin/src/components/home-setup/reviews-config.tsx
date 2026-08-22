"use client";

import { useState, useEffect, useRef } from "react";
import {
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
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
import { uploadService } from "@/services/upload.service";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { ImageShimmer } from "@/components/ui/image-shimmer";

export interface ReviewItem {
  id: string;
  name: string;
  review: number | string;
  desc: string;
  img: string;
  imageFile?: File;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionData: any;
  onSave: (data: any) => Promise<void>;
}

export function ReviewsConfigModal({
  open,
  onOpenChange,
  sectionData,
  onSave,
}: Props) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [uploadingIndexes, setUploadingIndexes] = useState<Set<number>>(
    new Set(),
  );
  const api = useAxiosAuth();

  // Use a map to store refs for file inputs
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  useEffect(() => {
    if (open) {
      const initialData = Array.isArray(sectionData) ? sectionData : [];
      setItems(
        initialData.map((item, idx) => ({
          id: item.id || `review-${Date.now()}-${idx}`,
          name: item.name || "",
          review: item.review ?? "",
          desc: item.desc || "",
          img: item.img || item.image || "",
        })),
      );
      setHasChanges(false);
    }
  }, [open, sectionData]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `review-${Date.now()}`,
        name: "",
        review: "",
        desc: "",
        img: "",
      },
    ]);
    setHasChanges(true);
  };

  const handleRemoveItem = (index: number) => {
    const item = items[index];
    if (item.img && item.imageFile) {
      URL.revokeObjectURL(item.img);
    }
    setItems(items.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleInputChange = (
    index: number,
    field: keyof ReviewItem,
    value: any,
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    setHasChanges(true);
  };

  const handleFileChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const newItems = [...items];
    const item = newItems[index];

    if (item.img && item.imageFile) {
      URL.revokeObjectURL(item.img);
    }

    item.img = previewUrl;
    item.imageFile = file;
    setItems(newItems);
    setHasChanges(true);

    if (e.target) e.target.value = "";
  };

  const validate = (): string | null => {
    if (items.length === 0) return "Please add at least one review.";
    for (const [index, item] of items.entries()) {
      if (!item.img) return `Review #${index + 1} is missing an image.`;
      const rating = String(item.review ?? "").trim();
      if (rating) {
        const numericRating = Number(rating);
        if (
          !Number.isFinite(numericRating) ||
          numericRating < 1 ||
          numericRating > 5
        ) {
          return `Review #${index + 1} rating must be between 1 and 5.`;
        }
      }
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
      const { uploadImage } = uploadService(api);
      const processedItems = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let finalImage = item.img;

        if (item.imageFile) {
          setUploadingIndexes((prev) => new Set(prev).add(i));
          try {
            const res = await uploadImage(item.imageFile);
            finalImage = res.publicUrl || res.fileUrl || res.url;
          } finally {
            setUploadingIndexes((prev) => {
              const newSet = new Set(prev);
              newSet.delete(i);
              return newSet;
            });
          }
        }

        const rating = String(item.review ?? "").trim();

        processedItems.push({
          id: item.id,
          name: item.name.trim(),
          review: rating ? Number(rating) : "",
          desc: item.desc.trim(),
          img: finalImage,
        });
      }

      await onSave(processedItems);
      setHasChanges(false);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && hasChanges) {
      setShowExitPrompt(true);
    } else {
      items.forEach((item) => {
        if (item.img && item.imageFile) URL.revokeObjectURL(item.img);
      });
      onOpenChange(newOpen);
      if (!newOpen) setHasChanges(false);
    }
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newItems = [...items];
    if (direction === "up" && index > 0) {
      [newItems[index - 1], newItems[index]] = [
        newItems[index],
        newItems[index - 1],
      ];
    } else if (direction === "down" && index < items.length - 1) {
      [newItems[index + 1], newItems[index]] = [
        newItems[index],
        newItems[index + 1],
      ];
    }
    setItems(newItems);
    setHasChanges(true);
  };

  return (
    <>
      <Dialog open={open && !showExitPrompt} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[95vw] w-full max-h-[95vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Reviews Configuration</DialogTitle>
            <DialogDescription>
              Manage customer testimonials. Recommended image size: 400x400px.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="relative group rounded-xl border bg-card p-6 shadow-sm"
              >
                <div className="absolute left-4 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    disabled={index === 0}
                    onClick={() => moveItem(index, "up")}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <div className="text-center text-xs font-medium text-muted-foreground">
                    {index + 1}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, "down")}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-6 pl-10 md:grid-cols-[128px_1fr]">
                  <div className="relative h-32 w-32 overflow-hidden rounded-lg border bg-muted/20">
                    {item.img ? (
                      <>
                        <ImageShimmer
                          src={item.img}
                          alt="Reviewer"
                          wrapperClassName="absolute inset-0"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleInputChange(index, "img", "")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="flex h-full w-full flex-col items-center justify-center transition-colors hover:bg-muted/40"
                        onClick={() => fileInputRefs.current[index]?.click()}
                      >
                        <ImageIcon className="mb-2 h-6 w-6 text-muted-foreground" />
                        <span className="text-[10px] font-medium uppercase text-muted-foreground">
                          Upload
                        </span>
                      </button>
                    )}
                    {uploadingIndexes.has(index) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      ref={(el) => {
                        fileInputRefs.current[index] = el;
                      }}
                      onChange={(e) => handleFileChange(index, e)}
                      accept="image/*"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Reviewer Name</Label>
                        <Input
                          value={item.name}
                          onChange={(e) =>
                            handleInputChange(index, "name", e.target.value)
                          }
                          placeholder="e.g. Eleanor P."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Rating (1-5)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="5"
                          step="0.5"
                          value={item.review}
                          onChange={(e) =>
                            handleInputChange(index, "review", e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Review Text</Label>
                      <Textarea
                        value={item.desc}
                        onChange={(e) =>
                          handleInputChange(index, "desc", e.target.value)
                        }
                        placeholder="Write the review here..."
                        className="min-h-[72px]"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-5 top-5 h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleRemoveItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              className="flex w-full flex-col items-center gap-2 border-dashed py-8"
              onClick={handleAddItem}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Plus className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                Add New Review
              </span>
            </Button>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || items.length === 0}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
              Changes you made will be lost if you exit without saving.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setShowExitPrompt(false);
                onOpenChange(false);
                setHasChanges(false);
              }}
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

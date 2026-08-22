"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { uploadService } from "@/services/upload.service";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { toast } from "sonner";
import { ImageUpload } from "@/components/products/image-upload";
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

// Define the ImageFile interface to match the one in ImageUpload
interface ImageFile {
  id: string;
  url: string;
  file?: File;
  isPrimary: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionData: any;
  onSave: (data: any) => Promise<void>;
}

export function AnimatedBannerConfigModal({
  open,
  onOpenChange,
  sectionData,
  onSave,
}: Props) {
  const api = useAxiosAuth();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showExitPrompt, setShowExitPrompt] = useState(false);

  useEffect(() => {
    if (open) {
      const initialImages: ImageFile[] = Array.isArray(sectionData)
        ? sectionData.map((item, index) => ({
            id: item.id || Math.random().toString(36).substring(7),
            url: item.image || "",
            isPrimary: index === 0,
          }))
        : [];
      setImages(initialImages);
      setHasChanges(false);
    }
  }, [open, sectionData]);

  const handleImagesChange = (newImages: ImageFile[]) => {
    setImages(newImages);
    setHasChanges(true);
  };

  const validate = (): string | null => {
    if (images.length === 0) return "At least one banner image is required.";
    for (let i = 0; i < images.length; i++) {
      if (!images[i].url && !images[i].file)
        return `Image ${i + 1} is missing a source.`;
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
      const { uploadImages } = uploadService(api);

      // Separate images into those that need uploading and those that already have URLs
      const toUpload = images
        .filter((img) => img.file)
        .map((img) => img.file as File);
      const existingUrls = images.filter((img) => !img.file);

      let uploadedResults: any[] = [];
      if (toUpload.length > 0) {
        const res = await uploadImages(toUpload);

        if (res.success.length === 0 && res.failed.length > 0) {
          toast.error(
            `All ${res.failed.length} uploads failed. Please check your connection.`,
          );
          setIsSaving(false);
          return;
        }

        if (res.failed.length > 0) {
          toast.error(
            `Failed to upload ${res.failed.length} images. Save canceled.`,
          );
          setIsSaving(false);
          return;
        }

        uploadedResults = res.success;
      }

      // Delete old images that were removed
      const finalImageUrls = images.map((img) => img.url).filter(Boolean);
      const { deleteUpload } = uploadService(api);

      // Find images that were in sectionData but are no longer in the final list
      const initialUrls = Array.isArray(sectionData)
        ? sectionData.map((item) => item.image).filter(Boolean)
        : [];
      const removedUrls = initialUrls.filter(
        (url) => !finalImageUrls.includes(url),
      );

      // Merge everything back in order
      let uploadIndex = 0;
      const finalData = images.map((img) => {
        if (img.file) {
          const uploaded = uploadedResults[uploadIndex++];
          // If this new file replaces an existing slot that had a URL, we should delete the old URL too
          // But we already tracked removals based on the final array of URLs.
          // Wait, `img.url` is a base64 string for new files. The original `url` is gone if they replaced it.
          // The above logic correctly finds removed URLs by comparing initialUrls with finalImageUrls.
          // Wait, `img.url` for a new file is blob/base64, which is not in `initialUrls`. So the old URL is correctly deemed removed!
          return {
            id: img.id,
            image:
              uploaded?.url ||
              uploaded?.publicUrl ||
              uploaded?.fileUrl ||
              img.url,
          };
        }
        return {
          id: img.id,
          image: img.url,
        };
      });

      // Trigger deletion in background
      Promise.allSettled(removedUrls.map((url) => deleteUpload(url))).catch(
        (e) => console.error("Failed to delete old images", e),
      );

      await onSave(finalData);
      setHasChanges(false);
      onOpenChange(false);
      toast.success("Banner configuration saved successfully!");
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

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[95vw] w-full max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Animated Banner Configuration</DialogTitle>
            <DialogDescription>
              Select and upload images for the banner sequence. You can reorder
              them by dragging. (Max 10 images)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6 font-sans">
            <div className="bg-muted/50 p-6 rounded-xl border-2 border-dashed border-border/60">
              <ImageUpload
                images={images}
                onChange={handleImagesChange}
                maxImages={10}
                showPrimary={false}
                showPreview={true}
              />
            </div>

            {images.length === 0 && (
              <div className="text-center p-12 bg-muted/20 border-2 border-dashed rounded-xl">
                <p className="text-muted-foreground font-medium">
                  No images selected yet. Drag and drop or browse to add banner
                  images.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="rounded-full px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-full px-8 bg-black hover:bg-zinc-800 text-white transition-all shadow-lg active:scale-95"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Apply Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showExitPrompt} onOpenChange={setShowExitPrompt}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">
              Discard changes?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-600">
              You have unsaved uploads or modifications. These will be lost if
              you leave now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">
              Continue Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowExitPrompt(false);
                setHasChanges(false);
                onOpenChange(false);
              }}
              className="bg-destructive hover:bg-destructive/90 text-white rounded-full px-6"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

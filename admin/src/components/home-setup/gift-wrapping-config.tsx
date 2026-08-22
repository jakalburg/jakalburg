"use client";

import { useState, useEffect, useRef } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
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

export interface GiftWrappingItem {
  id: string;
  image: string; // The URL of the image
  imageFile?: File; // For uploading
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionData: any;
  onSave: (data: any) => Promise<void>;
}

export function GiftWrappingConfigModal({
  open,
  onOpenChange,
  sectionData,
  onSave,
}: Props) {
  const [item, setItem] = useState<GiftWrappingItem>({ id: "1", image: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [uploading] = useState(false);
  const api = useAxiosAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      let initialData = Array.isArray(sectionData) ? sectionData : [];
      if (initialData.length > 0) {
        setItem({
          id: initialData[0].id || "1",
          image: initialData[0].image || "",
        });
      } else {
        setItem({ id: "1", image: "" });
      }
      setHasChanges(false);
    }
  }, [open, sectionData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setItem({ ...item, image: previewUrl, imageFile: file });
      setHasChanges(true);
    }
    if (e.target) e.target.value = ""; // Reset input
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    // Clean up object URL to avoid memory leaks
    if (item.image && item.imageFile) {
      URL.revokeObjectURL(item.image);
    }
    setItem({ ...item, image: "", imageFile: undefined });
    setHasChanges(true);
  };

  const validate = (): string | null => {
    if (!item.image)
      return `Please upload an image for the Gift Wrapping section.`;
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

      let finalImage = item.image;
      if (item.imageFile) {
        const res = await uploadImage(item.imageFile);
        finalImage = res.publicUrl || res.fileUrl || res.url;
      }

      const processedItem = {
        id: item.id,
        image: finalImage,
      };

      await onSave([processedItem]);
      setHasChanges(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to upload image or save config:", error);
      toast.error("Failed to upload image or save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && hasChanges) {
      setShowExitPrompt(true);
    } else {
      onOpenChange(newOpen);
      // Clean up object URL to avoid memory leaks if discarded
      if (!newOpen && item.image && item.imageFile) {
        URL.revokeObjectURL(item.image);
      }
      if (!newOpen) setHasChanges(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[95vw] w-full max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gift Wrapping Service</DialogTitle>
            <DialogDescription>
              Upload an image to display in the Gift Wrapping promotional
              section.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            <div className="space-y-4">
              <Label className="text-base">Promotional Layout Image</Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg, image/png, image/webp"
                className="hidden"
              />
              {item.image ? (
                <div className="space-y-3">
                  <ImageShimmer
                    src={item.image}
                    alt="Gift Wrapping Preview"
                    wrapperClassName="w-full aspect-[4/3] rounded-lg border shadow-sm"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={triggerUpload}
                      disabled={uploading}
                    >
                      Change
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveImage}
                      disabled={uploading}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={triggerUpload}
                  className="w-full aspect-[4/3] rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Click to upload an image
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG or WEBP (Max 5MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showExitPrompt} onOpenChange={setShowExitPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have an unsaved image upload. Do you want to discard it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowExitPrompt(false);
                onOpenChange(false);
                setHasChanges(false);
                // Clean up object URL
                if (item.image && item.imageFile) {
                  URL.revokeObjectURL(item.image);
                }
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

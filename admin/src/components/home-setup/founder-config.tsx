"use client";

import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Loader2, Trash2 } from "lucide-react";
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
import { toast } from "sonner";
import { uploadService } from "@/services/upload.service";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { ImageShimmer } from "@/components/ui/image-shimmer";

interface FounderData {
  name?: string;
  description?: string;
  image?: string;
  imageFile?: File;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionData: any;
  onSave: (data: any) => Promise<void>;
}

export function FounderConfigModal({
  open,
  onOpenChange,
  sectionData,
  onSave,
}: Props) {
  const api = useAxiosAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [item, setItem] = useState<FounderData>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    const data = Array.isArray(sectionData)
      ? sectionData[0] || {}
      : sectionData || {};

    setItem({
      name: data.name || "Khushie",
      description:
        data.description ||
        "Passionate about crafting jewelry that tells a story.",
      image: data.image || "",
    });
  }, [open, sectionData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setItem((current) => ({
      ...current,
      image: previewUrl,
      imageFile: file,
    }));

    e.target.value = "";
  };

  const handleSave = async () => {
    if (!item.image) {
      toast.error("Please upload a founder image.");
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

      await onSave({
        name: item.name || "Khushie",
        description:
          item.description ||
          "Passionate about crafting jewelry that tells a story.",
        image: finalImage,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to save founder configuration");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Founder Image Configuration</DialogTitle>
          <DialogDescription>
            Upload the image displayed in the Know Our Founder section.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Founder Image</Label>
            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-4 w-4" />
              Upload Image
            </Button>
          </div>

          {item.image ? (
            <div className="relative mx-auto aspect-square w-full max-w-[360px] overflow-hidden rounded-xl border bg-muted/20 shadow-sm">
              <ImageShimmer
                src={item.image}
                alt="Founder preview"
                wrapperClassName="absolute inset-0"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-3 top-3"
                onClick={() =>
                  setItem((current) => ({
                    ...current,
                    image: "",
                    imageFile: undefined,
                  }))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="mx-auto flex aspect-square w-full max-w-[360px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 text-muted-foreground">
              <ImageIcon className="mb-3 h-8 w-8" />
              <span>No image selected</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

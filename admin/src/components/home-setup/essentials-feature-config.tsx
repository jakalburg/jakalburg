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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/products/image-upload";
import { uploadSingleImage } from "@/services/uploads.service";
import { toast } from "sonner";

type ImageItem = {
  id: string;
  url: string;
  file?: File;
  isPrimary: boolean;
};

export interface EssentialsFeatureData {
  image?: string;
  body?: string;
  buttonLabel?: string;
  buttonLink?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionData: unknown;
  onSave: (data: EssentialsFeatureData) => Promise<void>;
}

const toImageItem = (url?: string): ImageItem[] =>
  url ? [{ id: "essentials-feature", url, isPrimary: true }] : [];

/**
 * Settings for the editorial band on the home page — the half-image,
 * half-copy block between the collection tiles and the essentials row.
 *
 * The eyebrow and heading are edited inline on the Home Setup row like every
 * other section; this modal owns the parts that are unique to it: the photo,
 * the paragraph, and the button.
 */
export function EssentialsFeatureConfigModal({
  open,
  onOpenChange,
  sectionData,
  onSave,
}: Props) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [body, setBody] = useState("");
  const [buttonLabel, setButtonLabel] = useState("");
  const [buttonLink, setButtonLink] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const data = useMemo(
    () => (sectionData as EssentialsFeatureData) || {},
    [sectionData],
  );

  useEffect(() => {
    if (!open) return;
    setImages(toImageItem(data.image));
    setBody(data.body || "");
    setButtonLabel(data.buttonLabel || "");
    setButtonLink(data.buttonLink || "");
  }, [open, data.image, data.body, data.buttonLabel, data.buttonLink]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const image = images[0];
      // Only pay for an upload when the admin picked a new file; a pasted or
      // unchanged URL goes through as-is.
      const imageUrl = image?.file
        ? await uploadSingleImage(image.file)
        : image?.url || "";

      await onSave({
        image: imageUrl,
        body,
        buttonLabel,
        buttonLink,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save the essentials feature:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save the section",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Essentials Feature</DialogTitle>
          <DialogDescription>
            The image, paragraph and button for the editorial band. The eyebrow
            and heading are edited on the section row itself.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
          <div className="space-y-3">
            <Label>Feature Image</Label>
            <ImageUpload
              images={images}
              onChange={setImages}
              maxImages={1}
              replaceWhenFull
              showPrimary={false}
              objectFit="cover"
              inputId="essentials-feature-image-upload"
              uploadLabel="Upload feature image"
            />
            <p className="text-xs text-muted-foreground">
              Shown at a 4:5 portrait crop beside the copy. Leave empty to keep
              the shipped placeholder.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Body Copy</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Tees, tanks, polos, shirts and knits — cut from long-staple cottons…"
              />
            </div>
            <div className="space-y-2">
              <Label>Button Label</Label>
              <Input
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
                placeholder="Shop essentials"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to hide the button entirely.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Button Link</Label>
              <Input
                value={buttonLink}
                onChange={(e) => setButtonLink(e.target.value)}
                placeholder="/essentials"
              />
            </div>
          </div>
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
            {isSaving ? "Saving..." : "Save Section"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { Switch } from "@/components/ui/switch";
import {
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Video,
  Play,
} from "lucide-react";
import { categoriesService } from "@/services/categories.service";
import { uploadService } from "@/services/upload.service";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { ImageShimmer } from "@/components/ui/image-shimmer";
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

export interface CategoryStoryItem {
  id: string;
  image: string; // The saved image URL
  imageFile?: File; // The newly selected image file
  video: string; // The saved original URL
  videoFile?: File; // The newly selected file
  mediaType?: "image" | "video";
  title: string;
  link: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionData: CategoryStoryItem[] | null;
  sectionEnabled?: boolean;
  onSave: (data: CategoryStoryItem[], enabled: boolean) => Promise<void>;
}

interface StoryCategory {
  id: string;
  parent: string;
  parentId?: string | null;
}

const DEFAULT_ITEM = (): CategoryStoryItem => ({
  id: Math.random().toString(36).substring(7),
  image: "",
  video: "",
  mediaType: "video",
  title: "New Category",
  link: "/shop",
});

const getLinkParam = (link: string | undefined, param: string) => {
  if (!link) return "";
  return link.match(new RegExp(`[?&]${param}=([^&]+)`))?.[1] || "";
};

const normalizeStoryLink = (link: string | undefined) => {
  if (!link?.trim()) return "/shop";

  const trimmedLink = link.trim();
  const legacyCategoryMatch = trimmedLink.match(/^\/shop\/([^/?#]+)\/?$/);

  if (legacyCategoryMatch?.[1]) {
    return `/shop?category=${encodeURIComponent(legacyCategoryMatch[1])}`;
  }

  return trimmedLink;
};

/** Mini preview card — mimics how it looks on the storefront */
function CardPreview({ item }: { item: CategoryStoryItem }) {
  return (
    <div className="relative overflow-hidden rounded-[10px] aspect-[3/4] flex flex-col items-center justify-center w-full max-w-[140px] mx-auto bg-[#10069f] shadow-md group">
      {/* Brand colour bg gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#10069f] via-[#1a0eb8] to-[#0b0472] z-0" />

      {/* Media preview */}
      {item.mediaType === "image" && item.image ? (
        <ImageShimmer
          src={item.image}
          alt={item.title || "Category story"}
          wrapperClassName="absolute inset-0 z-10"
          className="opacity-90 transition-opacity group-hover:opacity-100"
          sizes="140px"
        />
      ) : item.video ? (
        <video
          src={item.video}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-10 opacity-90 transition-opacity group-hover:opacity-100"
        />
      ) : (
        <ImageIcon className="relative z-10 w-8 h-8 text-white/20" />
      )}

      {/* Title label at bottom */}
      <div className="absolute bottom-0 left-0 right-0 pt-6 pb-2 px-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-center z-20">
        <p className="text-white text-[10px] font-bold tracking-widest uppercase m-0 leading-tight">
          {item.title || "Category"}
        </p>
      </div>
    </div>
  );
}

export function CategoryStoriesConfigModal({
  open,
  onOpenChange,
  sectionData,
  sectionEnabled = true,
  onSave,
}: Props) {
  const api = useAxiosAuth();
  const [items, setItems] = useState<CategoryStoryItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [isSectionEnabled, setIsSectionEnabled] = useState(true);

  // File upload refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadId = useRef<string | null>(null);

  const { data: categories = [] } = useQuery<StoryCategory[]>({
    queryKey: ["categories"],
    queryFn: () => categoriesService(api).getAll(),
  });

  const mainCategories = categories.filter((category) => !category.parentId);
  const subCategories = categories.filter((category) => category.parentId);

  useEffect(() => {
    if (open) {
      const initial =
        Array.isArray(sectionData) && sectionData.length > 0
          ? sectionData.map((item) => ({
              id: item.id,
              image: item.image || "",
              video: item.video || "",
              mediaType: item.mediaType || (item.image ? "image" : "video"),
              title: item.title || "Category",
              link: normalizeStoryLink(item.link),
            }))
          : [DEFAULT_ITEM()];
      setItems(initial);
      setIsSectionEnabled(sectionEnabled);
      setHasChanges(false);
    }
  }, [open, sectionData, sectionEnabled]);

  const handleVisibilityChange = (enabled: boolean) => {
    setIsSectionEnabled(enabled);
    setHasChanges(true);
  };

  const handleChange = (
    id: string,
    field: keyof CategoryStoryItem,
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
    setHasChanges(true);
  };

  const addItem = () => {
    setItems((prev) => [...prev, DEFAULT_ITEM()]);
    setHasChanges(true);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) {
      toast.error("At least one category card is required.");
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    setHasChanges(true);
  };

  const handleCategorySelect = (
    itemId: string,
    catId: string,
    isMain: boolean,
  ) => {
    const pool = isMain ? mainCategories : subCategories;
    const cat = pool.find((category) => category.id === catId);
    if (!cat) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              title: cat.parent,
              link: isMain
                ? `/shop?category=${cat.id}`
                : `/shop?subCategory=${cat.id}`,
            }
          : item,
      ),
    );
    setHasChanges(true);
  };

  const triggerUpload = (id: string) => {
    pendingUploadId.current = id;
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = pendingUploadId.current;
    if (!file || !targetId) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      toast.error("Please upload a valid image or video file.");
      pendingUploadId.current = null;
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setItems((prev) =>
      prev.map((item) =>
        item.id === targetId
          ? {
              ...item,
              image: isImage ? previewUrl : "",
              imageFile: isImage ? file : undefined,
              video: isVideo ? previewUrl : "",
              videoFile: isVideo ? file : undefined,
              mediaType: isImage ? "image" : "video",
            }
          : item,
      ),
    );
    setHasChanges(true);
    pendingUploadId.current = null;
  };

  const validate = (): string | null => {
    for (let i = 0; i < items.length; i++) {
      if (!items[i].image.trim() && !items[i].video.trim())
        return `Card ${i + 1} is missing an image or video.`;
      if (!items[i].title.trim()) return `Card ${i + 1} is missing a title.`;
    }
    return null;
  };

  const handleSave = async () => {
    if (isSectionEnabled) {
      const error = validate();
      if (error) {
        toast.error(error);
        return;
      }
    }
    setIsSaving(true);
    try {
      const uploader = uploadService(api);

      // Collect initial URLs for cleanup
      const initialUrls = Array.isArray(sectionData)
        ? sectionData
            .flatMap((item) => [item.image, item.video])
            .filter(Boolean)
        : [];

      // Upload any newly selected files concurrently
      const uploadedItems = await Promise.all(
        items.map(async (item) => {
          if (item.imageFile) {
            try {
              const result = await uploader.uploadImage(item.imageFile);
              const finalImage =
                result.url || result.publicUrl || result.fileUrl || "";
              return {
                ...item,
                image: finalImage,
                imageFile: undefined,
                video: "",
                videoFile: undefined,
                mediaType: "image" as const,
              };
            } catch (err) {
              console.error("Image upload failed for", item.title, err);
              throw new Error(`Failed to upload image for ${item.title}`);
            }
          }

          if (item.videoFile) {
            try {
              const result = await uploader.uploadVideo(item.videoFile);
              const finalVideo =
                result.url || result.publicUrl || result.fileUrl || "";
              return {
                ...item,
                image: "",
                imageFile: undefined,
                video: finalVideo,
                videoFile: undefined,
                mediaType: "video" as const,
              };
            } catch (err) {
              console.error("Video upload failed for", item.title, err);
              throw new Error(`Failed to upload video for ${item.title}`);
            }
          }
          return item;
        }),
      );

      const finalData = uploadedItems.map((item) => ({
        id: item.id,
        image: item.image,
        video: item.video,
        mediaType: item.mediaType || (item.image ? "image" : "video"),
        title: item.title,
        link: normalizeStoryLink(item.link),
      }));

      // Cleanup: Delete removed media
      const finalUrls = finalData
        .flatMap((d) => [d.image, d.video])
        .filter(Boolean);
      const removedUrls = initialUrls.filter((url) => !finalUrls.includes(url));

      if (removedUrls.length > 0) {
        Promise.allSettled(
          removedUrls.map((url) => uploader.deleteUpload(url)),
        ).catch((err) => console.error("Failed to cleanup old media:", err));
      }

      await onSave(finalData, isSectionEnabled);

      setItems(uploadedItems);
      setHasChanges(false);
      onOpenChange(false);
      toast.success(
        isSectionEnabled
          ? "Stories configuration saved successfully"
          : "Category Stories section hidden from site",
      );
    } catch (error) {
      console.error("Save error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save configuration",
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1.5">
                <DialogTitle>Category Stories Configuration</DialogTitle>
                <DialogDescription>
                  Each card can show an image or auto-looping video. Pick a
                  category and upload media for each card.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 sm:mt-0">
                <div className="text-right">
                  <Label
                    htmlFor="category-stories-section-visibility"
                    className="text-[11px] font-bold uppercase tracking-wider"
                  >
                    Show On Site
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {isSectionEnabled ? "Visible" : "Hidden"}
                  </p>
                </div>
                <Switch
                  id="category-stories-section-visibility"
                  checked={isSectionEnabled}
                  onCheckedChange={handleVisibilityChange}
                  disabled={isSaving}
                />
              </div>
            </div>
          </DialogHeader>

          {/* Hidden file input for images/videos */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/*"
            className="hidden"
          />

          {/* Live section preview strip */}
          {items.length > 0 && (
            <div className="rounded-xl border bg-muted/30 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest">
                  Section Preview
                </p>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {items.length} {items.length === 1 ? "Card" : "Cards"}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col items-center space-y-2"
                  >
                    <CardPreview item={item} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 py-2">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-[140px_1fr] gap-6 p-5 border rounded-xl bg-card shadow-sm relative group"
              >
                {/* Left — preview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-center h-6">
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest bg-muted px-2 py-0.5 rounded">
                      Card {index + 1}
                    </span>
                  </div>
                  <CardPreview item={item} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-[11px] gap-1.5 border-dashed"
                    onClick={() => triggerUpload(item.id)}
                  >
                    {item.mediaType === "image" ? (
                      <ImageIcon className="w-3.5 h-3.5" />
                    ) : (
                      <Video className="w-3.5 h-3.5" />
                    )}
                    {item.image || item.video
                      ? "Replace Media"
                      : "Upload Media"}
                  </Button>
                </div>

                {/* Right — fields */}
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-bold text-sm tracking-tight">
                      Configuration Settings
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      className="text-muted-foreground hover:text-destructive h-8 w-8 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Media Status Indicator */}
                  <div
                    className={`text-[11px] p-2 rounded-lg flex items-center justify-between ${item.image || item.video ? "bg-green-50 text-green-700 border border-green-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}
                  >
                    <div className="flex items-center gap-1.5">
                      {item.image || item.video ? (
                        <Play className="w-3 h-3 fill-current" />
                      ) : (
                        <ImageIcon className="w-3 h-3" />
                      )}
                      <span className="font-medium">
                        {item.image || item.video
                          ? `${item.mediaType === "image" ? "Image" : "Video"} is ready`
                          : "Media missing"}
                      </span>
                    </div>
                    {(item.imageFile || item.videoFile) && (
                      <span className="italic opacity-80 truncate max-w-[150px]">
                        {(item.imageFile || item.videoFile)?.name}
                      </span>
                    )}
                  </div>

                  {/* Title + Category selectors */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                        Title
                      </Label>
                      <Input
                        value={item.title}
                        className="h-9"
                        onChange={(e) =>
                          handleChange(item.id, "title", e.target.value)
                        }
                        placeholder="e.g. Earrings"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                        Main Category
                      </Label>
                      <Select
                        value={getLinkParam(item.link, "category")}
                        onValueChange={(val) =>
                          handleCategorySelect(item.id, val, true)
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Link to main…" />
                        </SelectTrigger>
                        <SelectContent>
                          {mainCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.parent}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                        Sub Category
                      </Label>
                      <Select
                        value={getLinkParam(item.link, "subCategory")}
                        onValueChange={(val) =>
                          handleCategorySelect(item.id, val, false)
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Link to sub…" />
                        </SelectTrigger>
                        <SelectContent>
                          {subCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.parent}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Navigation link preview */}
                  <div className="space-y-1 pt-1 bg-muted/20 p-2 rounded-md">
                    <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                      Generated Redirect Link
                    </Label>
                    <div className="flex items-center gap-2">
                      <code className="text-[11px] text-muted-foreground flex-1 break-all bg-background border rounded px-1.5 py-1">
                        {item.link || "/shop"}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={addItem}
            >
              <Plus className="w-4 h-4" /> Add Category Card
            </Button>
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
              You have unsaved changes. Close without saving?
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

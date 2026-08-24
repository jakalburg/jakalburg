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
  Plus,
  Trash,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import { uploadService } from "@/services/upload.service";
import { categoriesService } from "@/services/categories.service";
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

// An image-first hero slide: a background image OR video (with an optional
// mobile variant) plus a target link (auto-filled from a category). No copy —
// any headline/CTA is baked into the marketing image itself.
export interface HeroSliderItem {
  id: string;
  image: string;
  imageFile?: File;
  video: string;
  videoFile?: File;
  mobileImage?: string;
  mobileImageFile?: File;
  mobileVideo?: string;
  mobileVideoFile?: File;
  categoryId?: string;
  link: string;
}

interface HeroCategory {
  id: string;
  parent: string;
  parentId?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionData: HeroSliderItem[] | null;
  // Whether the hero currently renders as a full-bleed photo carousel (true) or
  // the split text+image layout (false). Saved back alongside the slides.
  sectionFullBleed?: boolean;
  onSave: (data: HeroSliderItem[], fullBleed: boolean) => Promise<void>;
}

export function HeroSliderConfigModal({
  open,
  onOpenChange,
  sectionData,
  sectionFullBleed = false,
  onSave,
}: Props) {
  const videoUrlPattern = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;
  const isVideoMediaUrl = (value: string) =>
    videoUrlPattern.test(value) ||
    value.includes("/video/upload/") ||
    /[?&](resource_type|type)=video\b/i.test(value);
  const api = useAxiosAuth();
  const [items, setItems] = useState<HeroSliderItem[]>([]);
  const [fullBleed, setFullBleed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showExitPrompt, setShowExitPrompt] = useState(false);

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<
    "media" | "mobileMedia" | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [] } = useQuery<HeroCategory[]>({
    queryKey: ["categories"],
    queryFn: () => categoriesService(api).getAll(),
  });

  const mainCategories = categories.filter((category) => !category.parentId);

  const getCategoryIdFromLink = (link?: string) => {
    if (!link) return "";

    try {
      const url = new URL(link, window.location.origin);
      return url.searchParams.get("category") || "";
    } catch {
      return link.match(/[?&]category=([^&]+)/)?.[1] || "";
    }
  };

  const getSaveErrorMessage = (error: unknown) => {
    if (typeof error === "object" && error !== null && "response" in error) {
      const response = (error as { response?: { data?: { message?: string } } })
        .response;
      return response?.data?.message;
    }

    return undefined;
  };

  useEffect(() => {
    if (open) {
      setItems(
        Array.isArray(sectionData)
          ? sectionData.map((item) => ({
              id: item.id,
              image: item.image || "",
              video: item.video || "",
              mobileImage: item.mobileImage || "",
              mobileVideo: item.mobileVideo || "",
              link: item.link || "",
              categoryId: item.categoryId || getCategoryIdFromLink(item.link),
            }))
          : [],
      );
      setFullBleed(!!sectionFullBleed);
      setHasChanges(false);
    }
  }, [open, sectionData, sectionFullBleed]);

  const validate = (): string | null => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.image && !item.video)
        return `Slide ${i + 1} needs a background image or video.`;
    }
    return null;
  };

  const handleAddItem = () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setItems([
      ...items,
      {
        id: Math.random().toString(36).substring(7),
        image: "",
        video: "",
        mobileImage: "",
        mobileVideo: "",
        categoryId: "",
        link: "",
      },
    ]);
    setHasChanges(true);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
    setHasChanges(true);
  };

  const handleChange = (
    id: string,
    field: keyof HeroSliderItem,
    value: string,
  ) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
    setHasChanges(true);
  };

  const handleMediaUrlChange = (
    id: string,
    value: string,
    target: "desktop" | "mobile" = "desktop",
  ) => {
    const trimmedValue = value.trim();
    const isVideo = isVideoMediaUrl(trimmedValue);

    setItems(
      items.map((item) =>
        item.id === id
          ? target === "mobile"
            ? {
                ...item,
                mobileImage: !trimmedValue || isVideo ? "" : value,
                mobileVideo: isVideo ? value : "",
                mobileImageFile: undefined,
                mobileVideoFile: undefined,
              }
            : {
                ...item,
                image: !trimmedValue || isVideo ? "" : value,
                video: isVideo ? value : "",
                imageFile: undefined,
                videoFile: undefined,
              }
          : item,
      ),
    );
    setHasChanges(true);
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[newIndex];
    newItems[newIndex] = temp;
    setItems(newItems);
    setHasChanges(true);
  };

  const triggerUpload = (id: string, field: "media" | "mobileMedia") => {
    setUploadingId(id);
    setUploadingField(field);
    fileInputRef.current?.click();
  };

  const handleClearHeroMedia = (
    id: string,
    target: "desktop" | "mobile" = "desktop",
  ) => {
    setItems(
      items.map((item) =>
        item.id === id
          ? target === "mobile"
            ? {
                ...item,
                mobileImage: "",
                mobileVideo: "",
                mobileImageFile: undefined,
                mobileVideoFile: undefined,
              }
            : {
                ...item,
                image: "",
                video: "",
                imageFile: undefined,
                videoFile: undefined,
              }
          : item,
      ),
    );
    setHasChanges(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingId || !uploadingField) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      toast.error("Please upload a valid image or video file.");
      setUploadingId(null);
      setUploadingField(null);
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setItems(
      items.map((item) =>
        item.id === uploadingId
          ? uploadingField === "media"
            ? {
                ...item,
                image: isVideo ? "" : previewUrl,
                imageFile: isVideo ? undefined : file,
                video: isVideo ? previewUrl : "",
                videoFile: isVideo ? file : undefined,
              }
            : {
                ...item,
                mobileImage: isVideo ? "" : previewUrl,
                mobileImageFile: isVideo ? undefined : file,
                mobileVideo: isVideo ? previewUrl : "",
                mobileVideoFile: isVideo ? file : undefined,
              }
          : item,
      ),
    );
    setHasChanges(true);

    setUploadingId(null);
    setUploadingField(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    // Require at least one slide
    if (items.length === 0) {
      toast.error("Please add at least one slide before saving.");
      return;
    }

    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setIsSaving(true);
    try {
      const { uploadImage, uploadVideo, deleteUpload } = uploadService(api);

      // Track initial URLs to detect deletions and replacements
      const initialUrls: string[] = [];
      if (Array.isArray(sectionData)) {
        sectionData.forEach((item) => {
          if (item.image) initialUrls.push(item.image);
          if (item.video) initialUrls.push(item.video);
          if (item.mobileImage) initialUrls.push(item.mobileImage);
          if (item.mobileVideo) initialUrls.push(item.mobileVideo);
        });
      }

      const processedItems = await Promise.all(
        items.map(async (item) => {
          let finalImage = item.image;
          let finalVideo = item.video;
          let finalMobileImage = item.mobileImage || "";
          let finalMobileVideo = item.mobileVideo || "";

          if (item.imageFile) {
            const res = await uploadImage(item.imageFile);
            finalImage = res.url || res.publicUrl || res.fileUrl || "";
            finalVideo = "";
          }

          if (item.videoFile) {
            const res = await uploadVideo(item.videoFile);
            finalVideo = res.url || res.publicUrl || res.fileUrl || "";
            finalImage = "";
          }

          if (item.mobileImageFile) {
            const res = await uploadImage(item.mobileImageFile);
            finalMobileImage = res.url || res.publicUrl || res.fileUrl || "";
            finalMobileVideo = "";
          }

          if (item.mobileVideoFile) {
            const res = await uploadVideo(item.mobileVideoFile);
            finalMobileVideo = res.url || res.publicUrl || res.fileUrl || "";
            finalMobileImage = "";
          }

          return {
            id: item.id,
            image: finalImage,
            video: finalVideo,
            mobileImage: finalMobileImage,
            mobileVideo: finalMobileVideo,
            categoryId: item.categoryId || getCategoryIdFromLink(item.link),
            link: item.link,
          };
        }),
      );

      // Find all final URLs to see which ones from the initial state were removed
      const finalUrls = processedItems
        .flatMap((item) => [
          item.image,
          item.video,
          item.mobileImage,
          item.mobileVideo,
        ])
        .filter(Boolean);
      const removedUrls = initialUrls.filter((url) => !finalUrls.includes(url));

      // Trigger background deletion for removed media
      Promise.allSettled(removedUrls.map((url) => deleteUpload(url))).catch(
        (e) => console.error("Failed to clean up old slider images", e),
      );

      await onSave(processedItems, fullBleed);
      setHasChanges(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save changes", error);
      toast.error(
        getSaveErrorMessage(error) ||
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
        <DialogContent className="sm:max-w-[800px] w-full max-h-[95vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Hero Slider Configuration</DialogTitle>
            <DialogDescription>
              Add the images (or videos) shown in the homepage hero. Any headline
              text should be part of the image itself.
            </DialogDescription>
          </DialogHeader>

          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            accept="image/*,video/*"
            onChange={handleFileChange}
          />

          {/* Presentation toggle: full-bleed photo hero vs the split layout. */}
          <div className="flex items-start justify-between gap-4 rounded-xl border bg-muted/30 p-4">
            <div className="space-y-1">
              <Label className="text-sm font-semibold">
                Full-photo hero
              </Label>
              <p className="text-xs text-muted-foreground">
                On — the slide fills the hero edge-to-edge (full photo). Off — the
                homepage shows the split layout: the headline &amp; buttons on the
                left and these slide images beside them.
              </p>
            </div>
            <Switch
              checked={fullBleed}
              onCheckedChange={(checked) => {
                setFullBleed(checked);
                setHasChanges(true);
              }}
            />
          </div>

          <div className="space-y-6 py-4">
            {items.length === 0 ? (
              <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
                No slides configured. Add your first slide below!
              </div>
            ) : (
              items.map((item, index) => {
                const currentMedia = item.video || item.image;
                const isCurrentMediaVideo = Boolean(item.video);
                const currentMobileMedia =
                  item.mobileVideo || item.mobileImage || "";
                const isCurrentMobileMediaVideo = Boolean(item.mobileVideo);

                return (
                  <div
                    key={item.id}
                    className="relative p-4 sm:p-6 border rounded-xl bg-card shadow-sm space-y-4"
                  >
                    {/* Header / Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 pb-2 border-b">
                      <h4 className="font-semibold text-lg flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        Slide {index + 1}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          disabled={index === 0}
                          onClick={() => moveItem(index, "up")}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          disabled={index === items.length - 1}
                          onClick={() => moveItem(index, "down")}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Slide Background Media (image / video / URL) */}
                    <div className="space-y-2">
                      <Label className="text-sm">Slide Background Media</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Upload or paste an image/video URL. Images use 1920 x
                        800; videos should be MP4/WebM/Ogg.
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <Input
                          className="flex-1"
                          value={currentMedia}
                          onChange={(e) =>
                            handleMediaUrlChange(item.id, e.target.value)
                          }
                          placeholder="https://...jpg or https://...mp4"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full sm:w-auto px-4"
                          onClick={() => triggerUpload(item.id, "media")}
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Upload Media
                        </Button>
                        {currentMedia && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-10 w-10"
                            aria-label="Clear slide background media"
                            onClick={() => handleClearHeroMedia(item.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {currentMedia && (
                        <div className="mt-3 h-40 w-full bg-muted rounded-lg overflow-hidden relative border shadow-sm">
                          {isCurrentMediaVideo ? (
                            <video
                              src={currentMedia}
                              className="w-full h-full object-cover"
                              autoPlay
                              loop
                              muted
                              playsInline
                            />
                          ) : (
                            <ImageShimmer
                              src={currentMedia}
                              alt="Preview"
                              wrapperClassName="absolute inset-0"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {/* Link target (category → link) */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Link Source (Main Categories)</Label>
                          <Select
                            value={
                              item.categoryId ||
                              getCategoryIdFromLink(item.link)
                            }
                            onValueChange={(val) => {
                              const selectedCat = mainCategories.find(
                                (category) => category.id === val,
                              );
                              if (selectedCat) {
                                const newItems = items.map((t) =>
                                  t.id === item.id
                                    ? {
                                        ...t,
                                        categoryId: selectedCat.id,
                                        link: `/shop?category=${selectedCat.id}`,
                                      }
                                    : t,
                                );
                                setItems(newItems);
                                setHasChanges(true);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Auto-fill link from a category (optional)" />
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
                        <div className="space-y-2">
                          <Label className="text-sm">Target Link</Label>
                          <Input
                            value={item.link || ""}
                            onChange={(e) =>
                              handleChange(item.id, "link", e.target.value)
                            }
                            placeholder="/new-arrivals"
                          />
                          <p className="text-xs text-muted-foreground">
                            Auto-filled when you pick a category — or type any
                            storefront path.
                          </p>
                        </div>
                      </div>

                      {/* Mobile media (optional) */}
                      <div className="space-y-2 md:border-l md:pl-6">
                        <Label className="text-sm">Mobile Hero Media</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Optional image/video shown only on mobile. Falls back
                          to the slide background media when empty.
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <Input
                            className="flex-1"
                            value={currentMobileMedia}
                            onChange={(e) =>
                              handleMediaUrlChange(
                                item.id,
                                e.target.value,
                                "mobile",
                              )
                            }
                            placeholder="https://...jpg or https://...mp4"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            className="w-full sm:w-auto px-4"
                            onClick={() => triggerUpload(item.id, "mobileMedia")}
                          >
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Upload Mobile
                          </Button>
                          {currentMobileMedia && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-10 w-10"
                              aria-label="Clear mobile hero media"
                              onClick={() =>
                                handleClearHeroMedia(item.id, "mobile")
                              }
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        {currentMobileMedia && (
                          <div className="mt-3 h-52 w-full max-w-[220px] bg-muted rounded-lg overflow-hidden relative border shadow-sm">
                            {isCurrentMobileMediaVideo ? (
                              <video
                                src={currentMobileMedia}
                                className="w-full h-full object-cover"
                                autoPlay
                                loop
                                muted
                                playsInline
                              />
                            ) : (
                              <ImageShimmer
                                src={currentMobileMedia}
                                alt="Mobile preview"
                                wrapperClassName="absolute inset-0"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed"
              onClick={handleAddItem}
            >
              <Plus className="w-4 h-4 mr-2" /> Add New Slide
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

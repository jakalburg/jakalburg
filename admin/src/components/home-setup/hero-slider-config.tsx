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
import Image from "next/image";
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
import { Switch } from "@/components/ui/switch";

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
  subtitle: string;
  title: string;
  buttonText: string;
  showButton?: boolean;
  categoryId?: string;
  link: string;
  navTitle: string;
  navTitle_original?: string;
  navIcon: string;
  showNavIcon?: boolean;
  showNavTitle?: boolean;
  navIconFile?: File;
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
  onSave: (data: HeroSliderItem[]) => Promise<void>;
}

export function HeroSliderConfigModal({
  open,
  onOpenChange,
  sectionData,
  onSave,
}: Props) {
  const videoUrlPattern = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;
  const isVideoMediaUrl = (value: string) =>
    videoUrlPattern.test(value) ||
    value.includes("/video/upload/") ||
    /[?&](resource_type|type)=video\b/i.test(value);
  const api = useAxiosAuth();
  const [items, setItems] = useState<HeroSliderItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showExitPrompt, setShowExitPrompt] = useState(false);

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<
    "media" | "mobileMedia" | "navIcon" | null
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
              ...item,
              mobileImage: item.mobileImage || "",
              mobileVideo: item.mobileVideo || "",
              showButton: item.showButton !== false,
              categoryId: item.categoryId || getCategoryIdFromLink(item.link),
              showNavIcon: item.showNavIcon !== false,
              showNavTitle: item.showNavTitle !== false,
            }))
          : [],
      );
      setHasChanges(false);
    }
  }, [open, sectionData]);

  const validate = (): string | null => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.showButton !== false && !item.buttonText.trim())
        return `Slide ${i + 1} is missing button text.`;
      if (item.showNavTitle !== false && !item.navTitle.trim())
        return `Slide ${i + 1} is missing a navigation title.`;
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
        subtitle: "",
        title: "",
        buttonText: "",
        showButton: false,
        categoryId: "",
        link: "",
        navTitle: "",
        showNavIcon: false,
        showNavTitle: false,
        navIcon: "",
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

  const handleToggle = (
    id: string,
    field: "showButton" | "showNavIcon" | "showNavTitle",
    value: boolean,
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

  const triggerUpload = (
    id: string,
    field: "media" | "mobileMedia" | "navIcon",
  ) => {
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

  const handleClearNavIcon = (id: string) => {
    setItems(
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              navIcon: "",
              navIconFile: undefined,
            }
          : item,
      ),
    );
    setHasChanges(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingId || !uploadingField) return;

    if (uploadingField === "media" || uploadingField === "mobileMedia") {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        toast.error("Please upload a valid image or video file.");
        setUploadingId(null);
        setUploadingField(null);
        return;
      }
    }

    if (uploadingField === "navIcon" && !file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      setUploadingId(null);
      setUploadingField(null);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video/");

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
            : uploadingField === "mobileMedia"
              ? {
                  ...item,
                  mobileImage: isVideo ? "" : previewUrl,
                  mobileImageFile: isVideo ? undefined : file,
                  mobileVideo: isVideo ? previewUrl : "",
                  mobileVideoFile: isVideo ? file : undefined,
                }
            : {
                ...item,
                navIcon: previewUrl,
                navIconFile: file,
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
          if (item.navIcon) initialUrls.push(item.navIcon);
        });
      }

      const processedItems = await Promise.all(
        items.map(async (item) => {
          let finalImage = item.image;
          let finalVideo = item.video;
          let finalMobileImage = item.mobileImage || "";
          let finalMobileVideo = item.mobileVideo || "";
          let finalNavIcon = item.navIcon;

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

          if (item.navIconFile) {
            const res = await uploadImage(item.navIconFile);
            finalNavIcon = res.url || res.publicUrl || res.fileUrl || "";
          }

          return {
            id: item.id,
            image: finalImage,
            video: finalVideo,
            mobileImage: finalMobileImage,
            mobileVideo: finalMobileVideo,
            subtitle: item.subtitle,
            title: item.title,
            buttonText: item.buttonText,
            showButton: item.showButton !== false,
            categoryId: item.categoryId || getCategoryIdFromLink(item.link),
            link: item.link,
            navTitle: item.navTitle,
            showNavIcon: item.showNavIcon !== false,
            showNavTitle: item.showNavTitle !== false,
            navIcon: finalNavIcon,
          };
        }),
      );

      // Find all final URLs to see which ones from the initial state have been removed
      const finalUrls = processedItems
        .flatMap((item) => [
          item.image,
          item.video,
          item.mobileImage,
          item.mobileVideo,
          item.navIcon,
        ])
        .filter(Boolean);
      const removedUrls = initialUrls.filter((url) => !finalUrls.includes(url));

      // Trigger background deletion for removed media
      Promise.allSettled(removedUrls.map((url) => deleteUpload(url))).catch(
        (e) => console.error("Failed to clean up old slider images", e),
      );

      await onSave(processedItems);
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
        <DialogContent className="sm:max-w-[95vw] w-full max-h-[95vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Hero Slider Configuration</DialogTitle>
            <DialogDescription>
              Manage your homepage hero banners.
            </DialogDescription>
          </DialogHeader>

          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            accept={
              uploadingField === "media" || uploadingField === "mobileMedia"
                ? "image/*,video/*"
                : "image/*"
            }
            onChange={handleFileChange}
          />

          <div className="space-y-6 py-4">
            {items.length === 0 ? (
              <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
                No slides configured. Add your first slide above!
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {/* Left Column: Core Data */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Main Title (e.g. Shine bright)</Label>
                          <Input
                            value={item.title}
                            onChange={(e) =>
                              handleChange(item.id, "title", e.target.value)
                            }
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="space-y-2">
                            <Label>Subtitle</Label>
                            <Input
                              value={item.subtitle}
                              onChange={(e) =>
                                handleChange(
                                  item.id,
                                  "subtitle",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
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
                                  const newItems = items.map((t) => {
                                    if (t.id === item.id) {
                                      return {
                                        ...t,
                                        buttonText: selectedCat.parent, // Use parent name as button text
                                        categoryId: selectedCat.id,
                                        link: `/shop?category=${selectedCat.id}`,
                                      };
                                    }
                                    return t;
                                  });
                                  setItems(newItems);
                                  setHasChanges(true);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Auto-fill from category" />
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
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <Label className="text-sm">Button Text</Label>
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor={`show-button-${item.id}`}
                                  className="text-xs text-muted-foreground"
                                >
                                  Display
                                </Label>
                                <Switch
                                  id={`show-button-${item.id}`}
                                  checked={item.showButton !== false}
                                  onCheckedChange={(checked) =>
                                    handleToggle(item.id, "showButton", checked)
                                  }
                                />
                              </div>
                            </div>
                            <Input
                              value={item.buttonText}
                              onChange={(e) =>
                                handleChange(
                                  item.id,
                                  "buttonText",
                                  e.target.value,
                                )
                              }
                              disabled={item.showButton === false}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">
                              Target Link (Auto-filled by Category)
                            </Label>
                            <Input
                              value={item.link || ""}
                              onChange={(e) =>
                                handleChange(item.id, "link", e.target.value)
                              }
                              placeholder="/shop"
                              disabled
                            />
                          </div>
                        </div>
                        <div className="space-y-2 pt-2">
                          <Label className="text-sm">
                            Slide Background Media
                          </Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Upload or paste an image/video URL. Images use 1920
                            x 800; videos should be MP4/WebM/Ogg.
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
                      </div>

                      {/* Right Column: Nav Data */}
                      <div className="space-y-4 md:border-l md:pl-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <Label>
                              Nav Title (Displays on Side thumbnails)
                            </Label>
                            <div className="flex items-center gap-2">
                              <Label
                                htmlFor={`show-nav-title-${item.id}`}
                                className="text-xs text-muted-foreground"
                              >
                                Display text
                              </Label>
                              <Switch
                                id={`show-nav-title-${item.id}`}
                                checked={item.showNavTitle !== false}
                                onCheckedChange={(checked) =>
                                  handleToggle(item.id, "showNavTitle", checked)
                                }
                              />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Tip: Use &lt;br /&gt; for line breaks (e.g. Ring
                            &lt;br /&gt;& Earring)
                          </p>
                          <Input
                            value={item.navTitle}
                            onChange={(e) =>
                              handleChange(item.id, "navTitle", e.target.value)
                            }
                            disabled={item.showNavTitle === false}
                          />
                        </div>
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between gap-3">
                            <Label className="text-base">
                              Nav Icon Image (Optional)
                            </Label>
                            <div className="flex items-center gap-2">
                              <Label
                                htmlFor={`show-nav-icon-${item.id}`}
                                className="text-xs text-muted-foreground"
                              >
                                Display icon
                              </Label>
                              <Switch
                                id={`show-nav-icon-${item.id}`}
                                checked={item.showNavIcon !== false}
                                onCheckedChange={(checked) =>
                                  handleToggle(item.id, "showNavIcon", checked)
                                }
                              />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Recommended size: 100 x 100 (Square)
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <Input
                              className="flex-1"
                              value={item.navIcon}
                              onChange={(e) =>
                                handleChange(item.id, "navIcon", e.target.value)
                              }
                              placeholder="https://..."
                              disabled={item.showNavIcon === false}
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              className="w-full sm:w-auto px-4"
                              onClick={() => triggerUpload(item.id, "navIcon")}
                              disabled={item.showNavIcon === false}
                            >
                              <ImageIcon className="w-4 h-4 mr-2" />
                              Upload Icon
                            </Button>
                            {item.navIcon && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-10 w-10"
                                aria-label="Clear navigation icon image"
                                onClick={() => handleClearNavIcon(item.id)}
                                disabled={item.showNavIcon === false}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          {item.showNavIcon !== false && item.navIcon && (
                            <div className="mt-3 h-20 w-20 bg-muted rounded-lg overflow-hidden relative border shadow-sm">
                              <Image
                                src={item.navIcon}
                                alt="Icon Preview"
                                fill
                                className="object-contain p-2"
                                unoptimized
                              />
                            </div>
                          )}
                        </div>
                        <div className="space-y-2 pt-2">
                          <Label className="text-sm">Mobile Hero Media</Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Optional image/video used only on mobile. Falls back
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
                              onClick={() =>
                                triggerUpload(item.id, "mobileMedia")
                              }
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

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
  Loader2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
} from "lucide-react";
import { uploadService } from "@/services/upload.service";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { ImageShimmer } from "@/components/ui/image-shimmer";
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

export interface InstagramVideoItem {
  id: string;
  video: string;
  mediaType?: "image" | "video";
  videoFile?: File;
}

const heicPattern = /\.(heic|heif)$/i;

const isHeicFile = (file: File) =>
  file.type === "image/heic" ||
  file.type === "image/heif" ||
  heicPattern.test(file.name);

const getDisplayImageUrl = (source: string) => {
  if (!source.includes("/image/upload/")) return source;
  if (source.includes("/image/upload/f_auto")) return source;
  return source.replace("/image/upload/", "/image/upload/f_auto,q_auto/");
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionData: any;
  onSave: (data: any) => Promise<void>;
}

export function AgirlInKayConfigModal({
  open,
  onOpenChange,
  sectionData,
  onSave,
}: Props) {
  const api = useAxiosAuth();
  const [items, setItems] = useState<InstagramVideoItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showExitPrompt, setShowExitPrompt] = useState(false);

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      let initialData = Array.isArray(sectionData) ? sectionData : [];
      let mappedData = initialData.map((item) => ({
        id: item.id || Math.random().toString(36).substring(7),
        video: item.video || "",
        mediaType: item.mediaType || "video",
      }));
      setItems(mappedData);
      setHasChanges(false);
    }
  }, [open, sectionData]);

  const handleAddItem = () => {
    const id = Math.random().toString(36).substring(7);
    setItems((current) => [...current, { id, video: "" }]);
    setUploadingId(id);
    setHasChanges(true);

    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
    setHasChanges(true);
  };

  const moveOrder = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[newIndex];
    newItems[newIndex] = temp;

    setItems(newItems);
    setHasChanges(true);
  };

  const triggerUpload = (id: string) => {
    setUploadingId(id);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingId) return;

    const isImage = file.type.startsWith("image/") || isHeicFile(file);
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      toast.error("Please upload a valid image or video file.");
      setUploadingId(null);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setItems(
      items.map((item) =>
        item.id === uploadingId
          ? {
              ...item,
              video: previewUrl,
              mediaType: isImage ? "image" : "video",
              videoFile: file,
            }
          : item,
      ),
    );
    setHasChanges(true);

    setUploadingId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validate = (): string | null => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.video) return `Reel Card ${i + 1} is missing a media file.`;
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
      const { uploadImage, uploadVideo } = uploadService(api);

      const processedItems = await Promise.all(
        items.map(async (item) => {
          let finalVideo = item.video;
          let finalMediaType = item.mediaType || "video";

          if (item.videoFile) {
            const isImage =
              item.videoFile.type.startsWith("image/") ||
              isHeicFile(item.videoFile);
            finalMediaType = isImage ? "image" : "video";
            const res = isImage
              ? await uploadImage(item.videoFile)
              : await uploadVideo(item.videoFile);
            finalVideo = res.publicUrl || res.fileUrl || res.url;
          }

          return {
            id: item.id,
            video: finalVideo,
            mediaType: finalMediaType,
          };
        }),
      );

      await onSave(processedItems);
      setHasChanges(false);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to upload media or save configuration");
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
            <DialogTitle>Trends on Instagram Feed</DialogTitle>
            <DialogDescription>
              Upload vertical image or video reels (9:16 aspect ratio) for your
              homepage feed.
            </DialogDescription>
          </DialogHeader>

          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            accept="image/*,video/*,.heic,.heif"
            onChange={handleFileChange}
          />

          <div className="space-y-6 py-4">
            {items.map((item, index) => {
              return (
                <div
                  key={item.id}
                  className="relative p-6 border rounded-xl bg-card shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={index === 0}
                          onClick={() => moveOrder(index, "up")}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={index === items.length - 1}
                          onClick={() => moveOrder(index, "down")}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                      </div>
                      <h4 className="font-semibold text-lg flex items-center gap-2">
                        Reel Card {index + 1}
                      </h4>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-6 pt-2">
                    {/* Media Upload Box */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-base">Reel Media</Label>
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full mt-2"
                          onClick={() => triggerUpload(item.id)}
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Select Image or Video
                        </Button>

                        {item.video && (
                          <div className="mt-4 w-full max-w-[200px] h-[350px] bg-black mx-auto rounded-lg overflow-hidden relative shadow-md">
                            {item.mediaType === "image" ? (
                              item.videoFile && isHeicFile(item.videoFile) ? (
                                <div className="flex h-full w-full flex-col items-center justify-center px-4 text-center text-sm text-white">
                                  <ImageIcon className="mb-3 h-8 w-8" />
                                  <span>HEIC image selected</span>
                                  <span className="mt-1 text-xs text-white/70">
                                    Preview will display after upload.
                                  </span>
                                </div>
                              ) : (
                                <ImageShimmer
                                  src={getDisplayImageUrl(item.video)}
                                  alt={`Reel card ${index + 1}`}
                                  wrapperClassName="absolute inset-0"
                                />
                              )
                            ) : (
                              <video
                                src={item.video}
                                className="object-cover w-full h-full"
                                muted
                                loop
                                playsInline
                                controls={false}
                                autoPlay
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                No Reels added yet. Click &quot;Add More&quot; to get started.
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={handleAddItem} className="gap-2">
                <Plus className="w-4 h-4" />
                Add More
              </Button>
            </div>
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
              You have unsaved media upload changes pending. Do you want to
              discard them?
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

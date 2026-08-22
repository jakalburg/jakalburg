"use client";

import { useState, useCallback, useRef } from "react";
import { X, Upload, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageShimmer } from "@/components/ui/image-shimmer";

interface ImageFile {
  id: string;
  url: string;
  file?: File;
  isPrimary: boolean;
}

interface ImageUploadProps {
  images: ImageFile[];
  onChange: (images: ImageFile[]) => void;
  maxImages?: number;
  showPrimary?: boolean;
  showPreview?: boolean;
  reorderable?: boolean;
  objectFit?: "cover" | "contain";
  /** When true, selecting a new file replaces the existing image at max capacity */
  replaceWhenFull?: boolean;
  inputId?: string;
  uploadLabel?: string;
}

export function ImageUpload({
  images,
  onChange,
  maxImages = 5,
  showPrimary = true,
  showPreview = true,
  reorderable = false,
  objectFit = "cover",
  replaceWhenFull = false,
  inputId = "image-upload",
  uploadLabel,
}: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!reorderable) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOverItem = (e: React.DragEvent) => {
    if (!reorderable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropItem = (e: React.DragEvent, dropIndex: number) => {
    if (!reorderable) return;
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newImages = [...images];
    const draggedItem = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, draggedItem);

    onChange(newImages);
    setDraggedIndex(null);
  };

  const readFileAsPreview = (file: File) =>
    new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;

      const imageFiles = Array.from(files).filter((file) =>
        file.type.startsWith("image/"),
      );
      if (imageFiles.length === 0) return;

      if (replaceWhenFull && images.length >= maxImages) {
        const file = imageFiles[0];
        const preview = await readFileAsPreview(file);
        onChange([
          {
            id: images[0]?.id || Math.random().toString(36).slice(2, 11),
            url: preview,
            file,
            isPrimary: true,
          },
        ]);
        return;
      }

      const newImages: ImageFile[] = [];
      const remainingSlots = maxImages - images.length;
      const filesToAdd = imageFiles.slice(0, remainingSlots);

      for (let i = 0; i < filesToAdd.length; i++) {
        const nextFile = filesToAdd[i];
        const preview = await readFileAsPreview(nextFile);
        newImages.push({
          id: Math.random().toString(36).slice(2, 11),
          url: preview,
          file: nextFile,
          isPrimary: showPrimary && images.length === 0 && i === 0,
        });
      }

      if (newImages.length > 0) {
        onChange([...images, ...newImages]);
      }
    },
    [images, maxImages, onChange, showPrimary, replaceWhenFull],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect],
  );

  const handleRemove = (id: string) => {
    const filtered = images.filter((img) => img.id !== id);
    if (selectedImageId === id) {
      setSelectedImageId(null);
    }
    // If removed image was primary, make first image primary
    if (
      showPrimary &&
      filtered.length > 0 &&
      !filtered.some((img) => img.isPrimary)
    ) {
      filtered[0].isPrimary = true;
    }
    onChange(filtered);
  };

  const handleSetPrimary = (id: string) => {
    onChange(
      images.map((img) => ({
        ...img,
        isPrimary: img.id === id,
      })),
    );
    setSelectedImageId(null);
  };

  const isAtCapacity = images.length >= maxImages;
  const canUploadMore = !isAtCapacity || replaceWhenFull;

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {canUploadMore && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200",
            dragOver ? "border-primary bg-primary/5" : "border-border",
          )}
        >
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">
            {uploadLabel ||
              (isAtCapacity && replaceWhenFull
                ? "Drag and drop to replace the image, or click to browse"
                : "Drag and drop images here, or click to browse")}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {images.length} / {maxImages} image{maxImages > 1 ? "s" : ""}{" "}
            uploaded
          </p>
          <input
            type="file"
            accept="image/*"
            multiple={maxImages > 1 && !replaceWhenFull}
            ref={fileInputRef}
            onChange={async (e) => {
              await handleFileSelect(e.target.files);
              e.target.value = "";
            }}
            className="hidden"
            id={inputId}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            {isAtCapacity && replaceWhenFull ? "Replace Image" : "Select Images"}
          </Button>
        </div>
      )}

      {/* Image Preview Grid */}
      {showPreview && images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              draggable={reorderable}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOverItem}
              onDrop={(e) => handleDropItem(e, index)}
              onClick={() => setSelectedImageId(image.id)}
              className={cn(
                "relative group rounded-lg overflow-hidden border-2 transition-all duration-200",
                reorderable && "cursor-move",
                showPrimary && image.isPrimary
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border",
                reorderable &&
                  draggedIndex === index &&
                  "opacity-50 border-primary border-dashed",
              )}
            >
              {/* Image */}
              <ImageShimmer
                src={image.url}
                alt="Product"
                wrapperClassName="aspect-square w-full"
                objectFit={objectFit}
              />

              <Button
                type="button"
                size="icon-sm"
                variant="destructive"
                onClick={(event) => {
                  event.stopPropagation();
                  handleRemove(image.id);
                }}
                className="absolute top-2 right-2 z-20 rounded-full shadow-sm"
                aria-label="Delete image"
              >
                <X className="w-4 h-4" />
              </Button>

              {/* Overlay */}
              <div
                className={cn(
                  "absolute inset-0 bg-black/60 opacity-0 transition-opacity duration-200 flex items-center justify-center gap-2 flex-wrap px-2",
                  "group-hover:opacity-100",
                  selectedImageId === image.id && "max-lg:opacity-100",
                )}
              >
                {replaceWhenFull && maxImages === 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      document.getElementById(inputId)?.click();
                    }}
                    className="text-xs"
                  >
                    Replace
                  </Button>
                )}
                {showPrimary && !image.isPrimary && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleSetPrimary(image.id);
                    }}
                    className="text-xs"
                  >
                    Set Primary
                  </Button>
                )}
              </div>

              {/* Primary Badge */}
              {showPrimary && image.isPrimary && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md font-medium">
                  Primary
                </div>
              )}

              {/* Drag Handle */}
              {reorderable && (
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-move">
                  <GripVertical className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

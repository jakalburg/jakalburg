"use client";

import { useRef, useState } from "react";
import { X, Plus, ChevronDown, ChevronUp, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ImageShimmer } from "@/components/ui/image-shimmer";

export interface ColorEntry {
  id: string;
  color: string;
  hexCode?: string;
  imageUrl: string;
}

export interface ProductColorGroup {
  id: string;
  productName: string;
  colors: ColorEntry[];
}

export interface ProductImageOption {
  id: string;
  url: string;
  file?: File;
}

const BASIC_COLORS: { name: string; hex: string }[] = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Red", hex: "#FF0000" },
  { name: "Blue", hex: "#0000FF" },
  { name: "Green", hex: "#008000" },
  { name: "Pink", hex: "#FFC0CB" },
  { name: "Beige", hex: "#F5F5DC" },
  { name: "Navy", hex: "#000080" },
];

interface GroupedColorImageManagerProps {
  value: ProductColorGroup[];
  onChange: (value: ProductColorGroup[]) => void;
  productImages: ProductImageOption[];
}

export function GroupedColorImageManager({
  value,
  onChange,
  productImages,
}: GroupedColorImageManagerProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [addingProductName, setAddingProductName] = useState("");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(value.map((g) => g.id))
  );

  // Color picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [pendingColor, setPendingColor] = useState<{
    name: string;
    hex: string;
  } | null>(null);
  const [colorName, setColorName] = useState("");
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  // Track initial values when dialog opens to detect changes
  const [initialDialogState, setInitialDialogState] = useState<{
    colorName: string;
    hex: string;
    imageUrl: string | null;
  } | null>(null);

  // All product images (both already uploaded and locally added) are available
  // for color mapping. Local images use blob URLs which work fine for display;
  // after the product is saved, the form submission handles uploading files
  // first, then the color images reference the final server URLs.
  const availableProductImages = productImages;

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // --- Product group CRUD ---

  const handleAddProduct = () => {
    if (!addingProductName.trim()) return;
    const newGroup: ProductColorGroup = {
      id: Math.random().toString(36).slice(2, 11),
      productName: addingProductName.trim(),
      colors: [],
    };
    onChange([...value, newGroup]);
    setExpandedGroups((prev) => new Set([...prev, newGroup.id]));
    setAddingProductName("");
    setShowAddProduct(false);

    // Automatically open color picker for the new product
    setActiveGroupId(newGroup.id);
    setPendingColor({ name: "", hex: "#000000" });
    setColorName("");
    setEditingColorId(null);
    setSelectedImageUrl(null);
    setInitialDialogState({ colorName: "", hex: "#000000", imageUrl: null });
    setPickerOpen(true);
  };

  const handleRemoveProduct = (groupId: string) => {
    onChange(value.filter((g) => g.id !== groupId));
  };

  const handleRenameProduct = (groupId: string, newName: string) => {
    onChange(
      value.map((g) => (g.id === groupId ? { ...g, productName: newName } : g))
    );
  };

  // --- Color CRUD within a group ---

  const openColorPicker = (
    groupId: string,
    color?: { name: string; hex: string },
    existingId?: string
  ) => {
    setActiveGroupId(groupId);
    setEditingColorId(existingId || null);
    const colorNameVal = color?.name || "";
    const hexVal = color?.hex || "#000000";
    setPendingColor(color || null);
    setColorName(colorNameVal);

    // Get existing image URL if editing
    let existingImageUrl: string | null = null;
    if (existingId) {
      const group = value.find((g) => g.id === groupId);
      existingImageUrl = group?.colors.find((c) => c.id === existingId)?.imageUrl || null;
    }
    setSelectedImageUrl(existingImageUrl);
    setInitialDialogState({
      colorName: colorNameVal,
      hex: hexVal,
      imageUrl: existingImageUrl,
    });
    setPickerOpen(true);
  };

  const handleBasicColorClick = (
    groupId: string,
    color: { name: string; hex: string }
  ) => {
    const group = value.find((g) => g.id === groupId);
    const existing = group?.colors.find(
      (c) => (c.hexCode || "").toLowerCase() === color.hex.toLowerCase()
    );
    if (existing) {
      openColorPicker(groupId, color, existing.id);
    } else {
      openColorPicker(groupId, color);
    }
  };

  const handleCustomColorChange = (
    groupId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const hex = e.target.value;
    const group = value.find((g) => g.id === groupId);
    const existing = group?.colors.find(
      (c) => (c.hexCode || "").toLowerCase() === hex.toLowerCase()
    );
    if (existing) {
      openColorPicker(groupId, { name: existing.color, hex }, existing.id);
    } else {
      openColorPicker(groupId, { name: hex, hex });
    }
  };

  const handleSaveColor = () => {
    if (!pendingColor || !activeGroupId || !selectedImageUrl) return;

    onChange(
      value.map((g) => {
        if (g.id !== activeGroupId) return g;

        if (editingColorId) {
          return {
            ...g,
            colors: g.colors.map((c) =>
              c.id === editingColorId
                ? { ...c, color: colorName.trim() || c.color, hexCode: pendingColor.hex, imageUrl: selectedImageUrl }
                : c
            ),
          };
        } else {
          return {
            ...g,
            colors: [
              ...g.colors,
              {
                id: Math.random().toString(36).slice(2, 11),
                color: colorName.trim() || pendingColor.name,
                hexCode: pendingColor.hex,
                imageUrl: selectedImageUrl,
              },
            ],
          };
        }
      })
    );

    setPickerOpen(false);
    setPendingColor(null);
    setEditingColorId(null);
    setActiveGroupId(null);
    setSelectedImageUrl(null);
    setInitialDialogState(null);
  };

  const handleRemoveColor = (groupId: string, colorId: string) => {
    onChange(
      value.map((g) =>
        g.id === groupId
          ? { ...g, colors: g.colors.filter((c) => c.id !== colorId) }
          : g
      )
    );
  };

  return (
    <div className="space-y-4">
      {/* Product groups */}
      {value.map((group) => {
        const isExpanded = expandedGroups.has(group.id);
        return (
          <div
            key={group.id}
            className="border border-border rounded-lg overflow-hidden"
          >
            {/* Group header */}
            <div
              className="flex items-center gap-3 px-4 py-3 bg-muted/30 cursor-pointer select-none"
              onClick={() => toggleGroup(group.id)}
            >
              <span className="text-muted-foreground">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </span>
              <Palette className="h-4 w-4 text-muted-foreground" />
              {isExpanded ? (
                <input
                  type="text"
                  value={group.productName}
                  onChange={(e) =>
                    handleRenameProduct(group.id, e.target.value)
                  }
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-transparent border-none text-sm font-medium focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
                  placeholder="Product name"
                />
              ) : (
                <span className="flex-1 text-sm font-medium truncate">
                  {group.productName || "Untitled Product"}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {group.colors.length} color{group.colors.length !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemoveProduct(group.id); }}
                className="text-destructive/70 hover:text-destructive transition-colors p-1"
                title="Remove product"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Group content — colors */}
            {isExpanded && (
              <div className="px-4 py-4 space-y-4">
                {/* Existing colors */}
                {group.colors.length > 0 && (
                  <div className="flex flex-wrap gap-4">
                    {group.colors.map((entry) => (
                      <div
                        key={entry.id}
                        className="relative group flex flex-col items-center w-24 border border-input rounded-xl overflow-visible bg-card"
                      >
                        <div className="w-full aspect-square bg-white border-b border-input rounded-t-xl overflow-hidden relative">
                          <ImageShimmer
                            src={entry.imageUrl}
                            alt={entry.color}
                            wrapperClassName="absolute inset-0"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              openColorPicker(
                                group.id,
                                {
                                  name: entry.color,
                                  hex: entry.hexCode || "#cccccc",
                                },
                                entry.id
                              )
                            }
                            className="absolute inset-0 bg-black/50 text-white text-[11px] flex items-center justify-center"
                          >
                            Change Image
                          </button>
                        </div>
                        <div className="w-full p-2 bg-muted/20 rounded-b-xl border-t border-input flex items-center gap-1.5 justify-center">
                          <span
                            className="inline-block h-3 w-3 rounded-full border border-border shrink-0"
                            style={{
                              backgroundColor: entry.hexCode || "#ccc",
                            }}
                          />
                          <span
                            className="text-[10px] truncate font-medium text-foreground"
                            title={entry.color}
                          >
                            {entry.color}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveColor(group.id, entry.id);
                          }}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full p-1 shadow-sm ring-2 ring-background z-10"
                          title={`Remove ${entry.color}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Color picker row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {BASIC_COLORS.map((c) => {
                    const added = group.colors.some(
                      (entry) =>
                        (entry.hexCode || "").toLowerCase() ===
                        c.hex.toLowerCase()
                    );
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => handleBasicColorClick(group.id, c)}
                        title={added ? `Edit ${c.name}` : `Add ${c.name}`}
                        className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-105"
                        style={{
                          backgroundColor: c.hex,
                          borderColor: added
                            ? "var(--primary)"
                            : "var(--border)",
                        }}
                      />
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveGroupId(group.id);
                      colorInputRef.current?.click();
                    }}
                    title="Custom color"
                    className="h-7 w-7 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add product button */}
      {showAddProduct ? (
        <div className="flex items-center gap-2">
          <Input
            value={addingProductName}
            onChange={(e) => setAddingProductName(e.target.value)}
            placeholder="Enter product name (e.g. Silk Saree)"
            className="flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddProduct();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAddProduct}
            disabled={!addingProductName.trim()}
          >
            Add
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowAddProduct(false);
              setAddingProductName("");
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddProduct(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Product
        </Button>
      )}

      {/* Hidden color input for custom color picker */}
      <input
        ref={colorInputRef}
        type="color"
        className="sr-only"
        onChange={(e) => {
          if (activeGroupId) {
            handleCustomColorChange(activeGroupId, e);
          }
        }}
      />

      {/* Image picker dialog */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span
                className="inline-block h-4 w-4 rounded-full border border-border shrink-0"
                style={{ backgroundColor: pendingColor?.hex }}
              />
              {editingColorId ? "Edit color & image" : "Choose image for this color"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="space-y-1.5 flex-1">
                <label className="text-sm font-medium">Color name</label>
                <Input
                  value={colorName}
                  onChange={(e) => setColorName(e.target.value)}
                  placeholder="e.g. Black"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={pendingColor?.hex || "#000000"}
                    onChange={(e) =>
                      setPendingColor((prev) => prev ? { ...prev, hex: e.target.value } : { name: colorName, hex: e.target.value })
                    }
                    className="h-9 w-9 rounded-md border border-input cursor-pointer p-0.5"
                  />
                  <span className="text-xs text-muted-foreground font-mono">
                    {pendingColor?.hex || "#000000"}
                  </span>
                </div>
              </div>
            </div>
            {availableProductImages.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4 text-center">
                Upload product images above first — the color image comes from that gallery.
              </p>
            ) : (
              <>
                <label className="text-sm font-medium">Select image</label>
                <div className="grid grid-cols-4 gap-3">
                  {availableProductImages.map((img) => {
                    const isSelected = selectedImageUrl === img.url;
                    return (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setSelectedImageUrl(img.url)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                          isSelected
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-input hover:border-primary"
                        }`}
                      >
                        <ImageShimmer
                          src={img.url}
                          alt="Product"
                          wrapperClassName="aspect-square w-full"
                        />
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPickerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveColor}
              disabled={
                !selectedImageUrl ||
                !colorName.trim() ||
                !!(initialDialogState &&
                  initialDialogState.colorName === colorName.trim() &&
                  initialDialogState.hex === (pendingColor?.hex || "#000000") &&
                  initialDialogState.imageUrl === selectedImageUrl)
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

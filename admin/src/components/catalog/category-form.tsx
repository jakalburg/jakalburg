"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { uploadSingleImage } from "@/services/uploads.service";
import { useCreateCategory, useUpdateCategory } from "@/hooks/use-categories";
import type { Category, CategoryGender } from "@/services/categories.service";

const GENDERS: { value: CategoryGender; label: string; hint: string }[] = [
  { value: "women", label: "Women", hint: "Appears under Women" },
  { value: "men", label: "Men", hint: "Appears under Men" },
  { value: "unisex", label: "Unisex", hint: "Products marked unisex" },
];

/** "Co-ord sets" → "co-ord-sets". Must match the server's slug rules. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CategoryForm({ category }: { category?: Category }) {
  const router = useRouter();
  const isEdit = !!category;

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [genders, setGenders] = useState<CategoryGender[]>(
    category?.genders ?? [],
  );
  const [description, setDescription] = useState(category?.description ?? "");
  const [image, setImage] = useState(category?.image ?? "");
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [order, setOrder] = useState(String(category?.order ?? 0));
  const [uploading, setUploading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // The slug follows the name until the admin edits it themselves — after
  // that it's theirs, so renaming the display name can't silently rewrite a
  // value that products are matched on.
  const [slugTouched, setSlugTouched] = useState(isEdit);
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  // A slug that products already reference can't change — the server refuses
  // it, because renaming would re-classify those products and break the
  // storefront's /category/<gender>-<slug> URLs with no redirect.
  const slugLocked = isEdit && (category?.productCount ?? 0) > 0;

  const toggleGender = (value: CategoryGender, checked: boolean) =>
    setGenders((prev) =>
      checked ? [...prev, value] : prev.filter((g) => g !== value),
    );

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      setImage(await uploadSingleImage(file));
    } catch (error) {
      toast.error("Image upload failed", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const pending = createCategory.isPending || updateCategory.isPending;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const finalSlug = slugify(slug || trimmedName);
    if (!trimmedName) return toast.error("Give the category a name");
    if (!finalSlug) return toast.error("Could not derive a slug from that name");

    const payload = {
      name: trimmedName,
      genders,
      description: description.trim() || null,
      image: image.trim() || null,
      isActive,
      order: Number(order) || 0,
      // Omitted when locked so the server never sees an unchanged slug as an
      // attempted rename.
      ...(slugLocked ? {} : { slug: finalSlug }),
    };

    const done = () => router.push("/categories");

    if (isEdit) {
      updateCategory.mutate(
        { id: category.id, data: payload },
        { onSuccess: done },
      );
    } else {
      createCategory.mutate(payload, { onSuccess: done });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/categories" aria-label="Back to categories">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? `Edit ${category.name}` : "New category"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? "Changes appear on the storefront and in the product form."
              : "It can be assigned to products as soon as you save."}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            The name is what shoppers see; the slug is the value stored on each
            product.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Co-ord sets"
                autoFocus={!isEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                disabled={slugLocked}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                onBlur={() => setSlug(slugify(slug))}
                placeholder="co-ord-sets"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {slugLocked
                  ? `Locked — ${category?.productCount} product(s) are filed under this slug. Rename the display name instead.`
                  : "Lowercase words joined by hyphens. Follows the name until you edit it."}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional — shown wherever the category is introduced."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Where it appears</CardTitle>
          <CardDescription>
            Leave all unticked to let the category show under whichever gender
            actually has stock in it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            {GENDERS.map((g) => (
              <div key={g.value} className="flex items-start gap-3">
                <Checkbox
                  id={`gender-${g.value}`}
                  checked={genders.includes(g.value)}
                  onCheckedChange={(checked) =>
                    toggleGender(g.value, checked === true)
                  }
                />
                <div className="grid gap-0.5 leading-none">
                  <Label htmlFor={`gender-${g.value}`}>{g.label}</Label>
                  <p className="text-xs text-muted-foreground">{g.hint}</p>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              This can only narrow the menu, never widen it — a category still
              needs live products for a gender before it appears there.
            </p>
          </div>

          <div className="flex items-center justify-between border-t pt-5">
            <div className="space-y-0.5">
              <Label htmlFor="active">Active</Label>
              <p className="text-xs text-muted-foreground">
                Off hides it from the storefront menu and the product picker.
                Products keep their category either way.
              </p>
            </div>
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <div className="space-y-2 border-t pt-5">
            <Label htmlFor="order">Menu order</Label>
            <Input
              id="order"
              type="number"
              min={0}
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="max-w-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              Lower sorts first; ties fall back to alphabetical.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Image</CardTitle>
          <CardDescription>Optional artwork for the category.</CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {image ? (
            <div className="flex items-center gap-4">
              <ImageShimmer
                src={image}
                alt={name || "Category"}
                wrapperClassName="h-24 w-24 rounded border"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setImage("")}
                  disabled={uploading}
                >
                  <X className="mr-1 h-4 w-4" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="mr-2 h-4 w-4" />
              )}
              {uploading ? "Uploading…" : "Upload image"}
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" asChild>
          <Link href="/categories">Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending || uploading}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Save changes" : "Create category"}
        </Button>
      </div>
    </form>
  );
}

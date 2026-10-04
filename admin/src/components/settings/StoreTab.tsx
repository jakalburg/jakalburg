"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useStoreSettings,
  useUpdateStoreSettings,
} from "@/hooks/use-store-settings";
import { ImageUpload } from "@/components/products/image-upload";
import { uploadProductImages } from "@/services/uploads.service";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { SettingsActions } from "./settings-layout";

/** The text fields on this screen, as they're stored on the server. */
type StoreForm = {
  storeName: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  mapLink: string;
  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
  seoTitle: string;
  seoDescription: string;
  siteUrl: string;
};

const EMPTY_FORM: StoreForm = {
  storeName: "",
  tagline: "",
  email: "",
  phone: "",
  address: "",
  mapLink: "",
  facebookUrl: "",
  instagramUrl: "",
  twitterUrl: "",
  linkedinUrl: "",
  youtubeUrl: "",
  seoTitle: "",
  seoDescription: "",
  siteUrl: "",
};

/** One slot in the ImageUpload picker (it always works with a list). */
type ImageItem = { id: string; url: string; file?: File; isPrimary: boolean };

const toSlot = (id: string, url?: string | null): ImageItem[] =>
  url ? [{ id, url, isPrimary: true }] : [];

/**
 * Settings → Store: the storefront's global identity.
 *
 * Everything here is read by the live site — the header and footer logo, the
 * footer tagline and social icons, the contact details on /contact, and the
 * default SEO tags. There is no publish step: saving updates the storefront on
 * its next load.
 */
export function StoreTab() {
  const { data: settings, isLoading } = useStoreSettings();
  const updateMutation = useUpdateStoreSettings();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<StoreForm>(EMPTY_FORM);
  const [logo, setLogo] = useState<ImageItem[]>([]);
  const [miniLogo, setMiniLogo] = useState<ImageItem[]>([]);
  const [favicon, setFavicon] = useState<ImageItem[]>([]);

  // Pull the server's values into the form — on load, and again on Cancel.
  const resetFromServer = useCallback(() => {
    if (!settings) return;
    setForm({
      storeName: settings.storeName || "",
      tagline: settings.tagline || "",
      email: settings.email || "",
      phone: settings.phone || "",
      address: settings.address || "",
      mapLink: settings.mapLink || "",
      facebookUrl: settings.facebookUrl || "",
      instagramUrl: settings.instagramUrl || "",
      twitterUrl: settings.twitterUrl || "",
      linkedinUrl: settings.linkedinUrl || "",
      youtubeUrl: settings.youtubeUrl || "",
      seoTitle: settings.seoTitle || "",
      seoDescription: settings.seoDescription || "",
      siteUrl: settings.siteUrl || "",
    });
    setLogo(toSlot("logo", settings.logo));
    setMiniLogo(toSlot("miniLogo", settings.miniLogo));
    setFavicon(toSlot("favicon", settings.favicon));
  }, [settings]);

  useEffect(resetFromServer, [resetFromServer]);

  const set = <K extends keyof StoreForm>(key: K, value: StoreForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleCancel = () => {
    setIsEditing(false);
    resetFromServer();
  };

  /**
   * Resolve one image slot to the URL we persist: upload a newly picked file
   * to Cloudinary, keep an existing URL untouched, or send "" when the admin
   * cleared the slot.
   *
   * `label` is only for the error message — an admin picking three marks at
   * once needs to know which one the backend refused.
   */
  const resolveImage = async (
    label: string,
    slot: ImageItem[],
  ): Promise<string> => {
    const picked = slot[0];
    if (!picked) return "";
    if (!picked.file) return picked.url;

    let result;
    try {
      result = await uploadProductImages([picked.file]);
    } catch (error: any) {
      const reason =
        error?.response?.data?.message || error?.message || "upload failed";
      throw new Error(`${label}: ${reason}`);
    }

    const url = result.uploaded[0]?.url;
    if (!url) {
      throw new Error(`${label}: ${result.failed[0]?.error ?? "no URL returned"}`);
    }
    return url;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Sequential, not Promise.all: three simultaneous Cloudinary uploads on
      // a slow link contend with each other and time out.
      const logoUrl = await resolveImage("Logo", logo);
      const miniLogoUrl = await resolveImage("Mini logo", miniLogo);
      const faviconUrl = await resolveImage("Favicon", favicon);

      updateMutation.mutate(
        { ...form, logo: logoUrl, miniLogo: miniLogoUrl, favicon: faviconUrl },
        { onSuccess: () => setIsEditing(false) },
      );
    } catch (error: any) {
      // Nothing is saved when an upload fails, so the form still holds the
      // admin's edits and they can retry without re-typing anything.
      toast.error("Nothing was saved — an image failed to upload", {
        description: error?.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const disabled = !isEditing;
  const busy = saving || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Store Information</CardTitle>
            <CardDescription>
              Your brand marks and name. These appear in the storefront header,
              footer and share previews.
            </CardDescription>
          </div>
          <SettingsActions>
            {!isEditing ? (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="w-full md:w-auto"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit Configuration
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={busy}
                  className="w-full md:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={busy}
                  className="w-full md:w-auto"
                >
                  {busy ? "Saving…" : "Save Configuration"}
                </Button>
              </>
            )}
          </SettingsActions>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
                    <ImageUpload
                      images={logo}
                      onChange={setLogo}
                      maxImages={1}
                      objectFit="contain"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Full wordmark. Shown in the storefront header and footer.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Mini Logo</Label>
                  <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
                    <ImageUpload
                      images={miniLogo}
                      onChange={setMiniLogo}
                      maxImages={1}
                      objectFit="contain"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Compact square mark. Used in tight spots and as the default
                    share image when a page has none.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Favicon</Label>
                  <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
                    <ImageUpload
                      images={favicon}
                      onChange={setFavicon}
                      maxImages={1}
                      objectFit="contain"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Browser tab icon. A square PNG works best.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Store Name</Label>
                  <Input
                    value={form.storeName}
                    onChange={(e) => set("storeName", e.target.value)}
                    disabled={disabled}
                    placeholder="Jakalburg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used in the logo alt text, the footer copyright and SEO tags.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input
                    value={form.tagline}
                    onChange={(e) => set("tagline", e.target.value)}
                    disabled={disabled}
                    placeholder="Considered wardrobe essentials…"
                  />
                  <p className="text-xs text-muted-foreground">
                    The one-liner under the footer logo.
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Details</CardTitle>
          <CardDescription>
            The store's global contact info. Rendered on the storefront Contact
            page — edit it here, not on the Website → Contact Page screen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Support/Contact Email</Label>
              <Input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                disabled={disabled}
                placeholder="care@jakalburg.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Support/Contact Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                disabled={disabled}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Store Address</Label>
            <Textarea
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              disabled={disabled}
              rows={3}
              placeholder="Full building address…"
            />
          </div>
          <div className="space-y-2">
            <Label>Google Maps Link</Label>
            <Input
              value={form.mapLink}
              onChange={(e) => set("mapLink", e.target.value)}
              disabled={disabled}
              placeholder="https://maps.google.com/..."
            />
            <p className="text-xs text-muted-foreground">
              Optional. When set, the address on the Contact page links to it.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
          <CardDescription>
            Each link you fill in gets an icon in the storefront footer. Leave a
            field blank to hide it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Instagram URL</Label>
              <Input
                value={form.instagramUrl}
                onChange={(e) => set("instagramUrl", e.target.value)}
                placeholder="https://instagram.com/yourstore"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label>Facebook URL</Label>
              <Input
                value={form.facebookUrl}
                onChange={(e) => set("facebookUrl", e.target.value)}
                placeholder="https://facebook.com/yourstore"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label>X / Twitter URL</Label>
              <Input
                value={form.twitterUrl}
                onChange={(e) => set("twitterUrl", e.target.value)}
                placeholder="https://x.com/yourstore"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label>YouTube URL</Label>
              <Input
                value={form.youtubeUrl}
                onChange={(e) => set("youtubeUrl", e.target.value)}
                placeholder="https://youtube.com/@yourstore"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label>LinkedIn URL</Label>
              <Input
                value={form.linkedinUrl}
                onChange={(e) => set("linkedinUrl", e.target.value)}
                placeholder="https://linkedin.com/company/yourstore"
                disabled={disabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO Defaults</CardTitle>
          <CardDescription>
            Fallback meta tags for pages that don't set their own, plus the
            origin used to build canonical URLs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Page Title</Label>
            <Input
              value={form.seoTitle}
              onChange={(e) => set("seoTitle", e.target.value)}
              disabled={disabled}
              placeholder="Jakalburg — Considered wardrobe essentials"
            />
          </div>
          <div className="space-y-2">
            <Label>Default Meta Description</Label>
            <Textarea
              value={form.seoDescription}
              onChange={(e) => set("seoDescription", e.target.value)}
              disabled={disabled}
              rows={3}
              placeholder="A short description of the store for search results."
            />
          </div>
          <div className="space-y-2">
            <Label>Site URL</Label>
            <Input
              value={form.siteUrl}
              onChange={(e) => set("siteUrl", e.target.value)}
              disabled={disabled}
              placeholder="https://jakalburg.com"
            />
            <p className="text-xs text-muted-foreground">
              The storefront's public origin, no trailing slash. Canonical and
              Open Graph URLs are built from it.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

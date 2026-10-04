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
import { toast } from "sonner";

export interface AnnouncementBarData {
  text?: string;
  linkHref?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionData: unknown;
  onSave: (data: AnnouncementBarData) => Promise<void>;
}

/** Must match the storefront's own fallback in AnnouncementBar.tsx. */
const DEFAULT_TEXT =
  "Complimentary shipping on orders over ₹2,499 · Easy 30-day returns";

/** The storefront's ink bar, so the preview reads as it will on the site. */
const BAR_BG = "oklch(0.21 0.01 70)";

/**
 * Settings for the thin bar above the header.
 *
 * Worth knowing while editing: this bar is on EVERY page, not just the home
 * page — it's grouped here because it's configured alongside the other
 * site-wide chrome (the footer background).
 */
export function AnnouncementBarConfigModal({
  open,
  onOpenChange,
  sectionData,
  onSave,
}: Props) {
  const [text, setText] = useState("");
  const [linkHref, setLinkHref] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const data = useMemo(
    () => (sectionData as AnnouncementBarData) || {},
    [sectionData],
  );

  useEffect(() => {
    if (!open) return;
    setText(data.text || "");
    setLinkHref(data.linkHref || "");
  }, [open, data.text, data.linkHref]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ text: text.trim(), linkHref: linkHref.trim() });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save the announcement bar:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save the section",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const previewText = text.trim() || DEFAULT_TEXT;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Announcement Bar</DialogTitle>
          <DialogDescription>
            The thin strip above the header. It shows on every page of the
            store, not only the home page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder={DEFAULT_TEXT}
            />
            <p className="text-xs text-muted-foreground">
              Keep it to one line — it sits on a single row on mobile. Leave
              empty to use the shipped copy. To hide the bar entirely, switch
              the section off on the Home Setup row.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Link (optional)</Label>
            <Input
              value={linkHref}
              onChange={(e) => setLinkHref(e.target.value)}
              placeholder="/collections/sale"
            />
            <p className="text-xs text-muted-foreground">
              Makes the whole bar clickable. Leave empty for plain text.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Preview</Label>
            <div
              className="rounded-md px-4 py-2 text-center text-xs tracking-wide text-white"
              style={{ backgroundColor: BAR_BG }}
            >
              <span className={linkHref.trim() ? "underline" : undefined}>
                {previewText}
              </span>
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

"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetContact, useUpdateContact } from "@/hooks/use-website-pages";
import { ImageUpload } from "@/components/products/image-upload";
import { uploadService } from "@/services/upload.service";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { toast } from "sonner";
import { Pencil, Settings } from "lucide-react";
import Link from "next/link";

type ContactImageItem = {
  id: string;
  url: string;
  file?: File;
  isPrimary: boolean;
};

const DEFAULT_CONTACT_IMAGE =
  "https://res.cloudinary.com/diukjb3ma/image/upload/v1773753711/Sculptures/main_about.png";

/**
 * Editor for the storefront Contact page, reached from Website → Static Pages.
 *
 * Contact doesn't live in the `Page` model like the policy pages do — its
 * content is structured (heading, blurb, "need it today" block, banner), not
 * rich text — so it keeps its own singleton (`WebsiteContact`) and its own
 * form. It's listed alongside the other pages so there's one place to go
 * looking for page content.
 *
 * The contact DETAILS (email, phone, address, map link) are not here: they're
 * global — the footer and SEO tags want them too — and live in Settings → Store.
 */
export function ContactPageForm() {
  const { data: contactData, isLoading: isLoadingContact } = useGetContact();
  const updateContactMutation = useUpdateContact();

  const api = useAxiosAuth();

  const [isEditing, setIsEditing] = useState(false);

  // Contact Page Specific
  const [contactImageOverride, setContactImageOverride] = useState<
    ContactImageItem[] | null
  >(null);
  const [contactTitleOverride, setContactTitleOverride] = useState<
    string | null
  >(null);
  const [contactDescriptionOverride, setContactDescriptionOverride] = useState<
    string | null
  >(null);
  const [needTodayTitleOverride, setNeedTodayTitleOverride] = useState<
    string | null
  >(null);
  const [needTodayDescriptionOverride, setNeedTodayDescriptionOverride] =
    useState<string | null>(null);

  const contactTitle = contactTitleOverride ?? contactData?.title ?? "";
  const contactDescription =
    contactDescriptionOverride ?? contactData?.formDescription ?? "";
  const needTodayTitle =
    needTodayTitleOverride ?? contactData?.needTodayTitle ?? "Need It Today?";
  const needTodayDescription =
    needTodayDescriptionOverride ??
    contactData?.needTodayDescription ??
    "For order help, styling questions, custom requests, or instant delivery in Surat, contact us directly on the phone number or email above.";
  const defaultContactImage: ContactImageItem[] = contactData
    ? [
        {
          id: "contact",
          url: contactData.contactImage || DEFAULT_CONTACT_IMAGE,
          isPrimary: true,
        },
      ]
    : [];
  const contactImage = contactImageOverride ?? defaultContactImage;

  const handleCancel = () => {
    setIsEditing(false);
    setContactTitleOverride(null);
    setContactDescriptionOverride(null);
    setNeedTodayTitleOverride(null);
    setNeedTodayDescriptionOverride(null);
    setContactImageOverride(null);
  };

  const resolveContactImageUrl = async () => {
    const current = contactImage[0];
    if (!current) {
      return contactData?.contactImage || "";
    }

    if (current.file) {
      const uploaded = await uploadService(api).uploadImage(current.file);
      return uploaded.publicUrl || uploaded.url || uploaded.fileUrl || "";
    }

    if (current.url?.startsWith("http")) {
      return current.url;
    }

    return contactData?.contactImage || "";
  };

  const handleSaveContact = async () => {
    try {
      const contactImageUrl = await resolveContactImageUrl();

      // Page copy only — the contact details are saved from Settings → Store.
      updateContactMutation.mutate(
        {
          contactImage: contactImageUrl,
          title: contactTitle,
          formDescription: contactDescription,
          needTodayTitle,
          needTodayDescription,
        },
        {
          onSuccess: () => {
            setIsEditing(false);
            toast.success("Contact configurations saved successfully");
          },
          onError: () => toast.error("Failed to save contact configurations"),
        },
      );
    } catch {
      toast.error("Failed to process save request");
    }
  };

  const isLoadingTotal = isLoadingContact;

  return (
    <div className="space-y-6">
      {/* The email/phone/address/map fields used to live here. They're global —
          the footer and SEO tags want them too — so they moved to Settings →
          Store and this screen keeps only the page copy. A slim note rather
          than a card, so it doesn't read as another thing to fill in. */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Email, phone, address and map link are{" "}
          <span className="text-foreground">global store settings</span> — they
          show here and across the rest of the site.
        </p>
        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link href="/settings/store">
            <Settings className="w-4 h-4 mr-2" /> Edit in Settings
          </Link>
        </Button>
      </div>

      {/* Contact Page Texts Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Contact Page Layout</CardTitle>
            <CardDescription>
              Manage the text and image displayed beside the contact form.
            </CardDescription>
          </div>
          {!isEditing ? (
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="w-full sm:w-auto shrink-0"
            >
              <Pencil className="w-4 h-4 mr-2" /> Edit Layout
            </Button>
          ) : (
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveContact}
                disabled={updateContactMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingTotal ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Heading</Label>
                  <Input
                    value={contactTitle}
                    onChange={(e) => setContactTitleOverride(e.target.value)}
                    disabled={!isEditing}
                    placeholder="START A CONVERSATION"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Description</Label>
                  <Textarea
                    value={contactDescription}
                    onChange={(e) =>
                      setContactDescriptionOverride(e.target.value)
                    }
                    disabled={!isEditing}
                    rows={3}
                    placeholder="We're here to help with your orders, styling questions, and custom jewellery requests."
                  />
                </div>
              </div>

      
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

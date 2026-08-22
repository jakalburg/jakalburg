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
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useGetContact, useUpdateContact } from "@/hooks/use-website-pages";
import { ImageUpload } from "@/components/products/image-upload";
import { uploadService } from "@/services/upload.service";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

type ContactImageItem = {
  id: string;
  url: string;
  file?: File;
  isPrimary: boolean;
};

const DEFAULT_CONTACT_IMAGE =
  "https://res.cloudinary.com/diukjb3ma/image/upload/v1773753711/Sculptures/main_about.png";

export function ContactTab() {
  const { data: storeSettings, isLoading: isLoadingStore } = useSettings();
  const updateStoreMutation = useUpdateSettings();

  const { data: contactData, isLoading: isLoadingContact } = useGetContact();
  const updateContactMutation = useUpdateContact();

  const api = useAxiosAuth();

  const [isEditing, setIsEditing] = useState(false);

  // Global Store Info
  const [storeEmailOverride, setStoreEmailOverride] = useState<string | null>(
    null,
  );
  const [storePhoneOverride, setStorePhoneOverride] = useState<string | null>(
    null,
  );
  const [storeAddressOverride, setStoreAddressOverride] = useState<
    string | null
  >(null);
  const [storeMapLinkOverride, setStoreMapLinkOverride] = useState<
    string | null
  >(null);

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

  const storeEmail = storeEmailOverride ?? storeSettings?.storeEmail ?? "";
  const storePhone = storePhoneOverride ?? storeSettings?.storePhone ?? "";
  const storeAddress =
    storeAddressOverride ?? storeSettings?.storeAddress ?? "";
  const storeMapLink =
    storeMapLinkOverride ?? storeSettings?.storeMapLink ?? "";
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
    setStoreEmailOverride(null);
    setStorePhoneOverride(null);
    setStoreAddressOverride(null);
    setStoreMapLinkOverride(null);
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

      // 2. Save Global Settings
      updateStoreMutation.mutate(
        {
          storeEmail,
          storePhone,
          storeAddress,
          storeMapLink,
        },
        {
          onError: () => toast.error("Failed to save global store info"),
        },
      );

      // 3. Save Contact Page specific strings
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
          onError: () => toast.error("Failed to save contact text elements"),
        },
      );
    } catch {
      toast.error("Failed to process save request");
    }
  };

  const isLoadingTotal = isLoadingStore || isLoadingContact;

  return (
    <div className="space-y-6">
      {/* Global Store Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Global Store Contact Details</CardTitle>
            <CardDescription>
              Manage your business contact info (syncs across the entire
              website).
            </CardDescription>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {!isEditing ? (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="w-full sm:w-auto"
              >
                <Pencil className="w-4 h-4 mr-2" /> Edit Configuration
              </Button>
            ) : (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveContact}
                  disabled={
                    updateStoreMutation.isPending ||
                    updateContactMutation.isPending
                  }
                >
                  Save All
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingTotal ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Support/Contact Email</Label>
                  <Input
                    value={storeEmail}
                    onChange={(e) => setStoreEmailOverride(e.target.value)}
                    disabled={!isEditing}
                    placeholder="contact@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Support/Contact Phone</Label>
                  <Input
                    value={storePhone}
                    onChange={(e) => setStorePhoneOverride(e.target.value)}
                    disabled={!isEditing}
                    placeholder="+1 234 567 89"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Store Address</Label>
                <Textarea
                  value={storeAddress}
                  onChange={(e) => setStoreAddressOverride(e.target.value)}
                  disabled={!isEditing}
                  rows={3}
                  placeholder="Full building address..."
                />
              </div>

              <div className="space-y-2">
                <Label>Google Maps Link (Embed or URL)</Label>
                <Input
                  value={storeMapLink}
                  onChange={(e) => setStoreMapLinkOverride(e.target.value)}
                  disabled={!isEditing}
                  placeholder="https://maps.google.com/..."
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Contact Page Texts Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Contact Page Layout</CardTitle>
            <CardDescription>
              Manage the text and image displayed beside the contact form.
            </CardDescription>
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="w-full sm:w-auto shrink-0"
            >
              <Pencil className="w-4 h-4 mr-2" /> Edit Layout
            </Button>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Need It Today Heading</Label>
                  <Input
                    value={needTodayTitle}
                    onChange={(e) =>
                      setNeedTodayTitleOverride(e.target.value)
                    }
                    disabled={!isEditing}
                    placeholder="Need It Today?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Need It Today Description</Label>
                  <Textarea
                    value={needTodayDescription}
                    onChange={(e) =>
                      setNeedTodayDescriptionOverride(e.target.value)
                    }
                    disabled={!isEditing}
                    rows={3}
                    placeholder="For order help, styling questions, custom requests, or instant delivery in Surat..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground font-semibold">
                  Contact Banner Image
                </Label>
                <p className="text-xs text-muted-foreground">
                  This image is shown on the Contact page beside the form.
                </p>
                <div
                  className={!isEditing ? "opacity-50 pointer-events-none" : ""}
                >
                  <ImageUpload
                    images={contactImage}
                    onChange={(files) => setContactImageOverride(files)}
                    maxImages={1}
                    replaceWhenFull
                    showPrimary={false}
                    inputId="contact-banner-image-upload"
                    uploadLabel="Upload contact page banner image"
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

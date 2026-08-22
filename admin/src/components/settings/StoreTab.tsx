"use client";

import { useState, useEffect, useRef } from "react";
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
  useSettings,
  useUpdateSettings,
  useResetDefaults,
} from "@/hooks/use-settings";
import { ImageUpload } from "@/components/products/image-upload";
import { uploadService } from "@/services/upload.service";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { toast } from "sonner";
import { Pencil, AlertTriangle, RefreshCcw, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SettingsActions } from "./settings-layout";

export function StoreTab() {
  const { data: storeSettings, isLoading: isLoadingStore } = useSettings();
  const updateStoreMutation = useUpdateSettings();
  const resetDefaultsMutation = useResetDefaults();
  const api = useAxiosAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [shippingCost, setShippingCost] = useState(30);
  const [taxRate, setTaxRate] = useState(18);
  const [currency, setCurrency] = useState("INR");
  const [storeName, setStoreName] = useState("");
  const [storeEmail, setStoreEmail] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [storeMapLink, setStoreMapLink] = useState("");
  const [logo, setLogo] = useState<any[]>([]);

  useEffect(() => {
    if (storeSettings) {
      setShippingCost(storeSettings.shippingCost);
      setTaxRate(storeSettings.taxRate);
      setCurrency(storeSettings.currency);
      setStoreName(storeSettings.storeName || "");
      setStoreEmail(storeSettings.storeEmail || "");
      setStorePhone(storeSettings.storePhone || "");
      setStoreAddress(storeSettings.storeAddress || "");
      setStoreDescription(storeSettings.storeDescription || "");
      setFacebookUrl(storeSettings.facebookUrl || "");
      setInstagramUrl(storeSettings.instagramUrl || "");
      setTwitterUrl(storeSettings.twitterUrl || "");
      setLinkedinUrl(storeSettings.linkedinUrl || "");
      setYoutubeUrl(storeSettings.youtubeUrl || "");
      setStoreMapLink(storeSettings.storeMapLink || "");
      if (storeSettings.logo) {
        setLogo([{ id: "logo", url: storeSettings.logo, isPrimary: true }]);
      } else {
        setLogo([]);
      }
    }
  }, [storeSettings]);

  const handleCancel = () => {
    setIsEditing(false);
    if (storeSettings) {
      setShippingCost(storeSettings.shippingCost);
      setTaxRate(storeSettings.taxRate);
      setCurrency(storeSettings.currency);
      setStoreName(storeSettings.storeName || "");
      setStoreEmail(storeSettings.storeEmail || "");
      setStorePhone(storeSettings.storePhone || "");
      setStoreAddress(storeSettings.storeAddress || "");
      setStoreDescription(storeSettings.storeDescription || "");
      setFacebookUrl(storeSettings.facebookUrl || "");
      setInstagramUrl(storeSettings.instagramUrl || "");
      setTwitterUrl(storeSettings.twitterUrl || "");
      setLinkedinUrl(storeSettings.linkedinUrl || "");
      setYoutubeUrl(storeSettings.youtubeUrl || "");
      setStoreMapLink(storeSettings.storeMapLink || "");
      if (storeSettings.logo) {
        setLogo([{ id: "logo", url: storeSettings.logo, isPrimary: true }]);
      } else {
        setLogo([]);
      }
    }
  };

  const handleSaveStore = async () => {
    try {
      let logoUrl = logo.length > 0 ? logo[0].url : "";
      if (logo.length > 0 && logo[0].file) {
        const uploaded = await uploadService(api).uploadImage(logo[0].file);
        logoUrl = uploaded.publicUrl;
      } else if (logo.length === 0) {
        logoUrl = "";
      }

      updateStoreMutation.mutate(
        {
          shippingCost,
          taxRate,
          currency,
          storeName,
          storeEmail,
          storePhone,
          storeAddress,
          storeDescription,
          facebookUrl,
          instagramUrl,
          twitterUrl,
          linkedinUrl,
          youtubeUrl,
          storeMapLink,
          logo: logoUrl,
        },
        {
          onSuccess: () => {
            setIsEditing(false);
          },
        },
      );
    } catch {
      toast.error("Failed to upload images or save settings");
    }
  };

  const handleResetDefaults = () => {
    if (
      window.confirm(
        "ARE YOU SURE? This will reset all store brandings, about us data, and general info to Kay defaults. This cannot be undone.",
      )
    ) {
      resetDefaultsMutation.mutate();
    }
  };

  return (
    <div className="space-y-4">
      {/* Basic Store Info */}
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Store Information</CardTitle>
            <CardDescription>
              Basic information about your store
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
                  className="w-full md:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveStore}
                  disabled={updateStoreMutation.isPending}
                  className="w-full md:w-auto"
                >
                  Save Configuration
                </Button>
              </>
            )}
          </SettingsActions>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingStore ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Store Logo</Label>
                <div
                  className={!isEditing ? "opacity-50 pointer-events-none" : ""}
                >
                  <ImageUpload
                    images={logo}
                    onChange={(files) => setLogo(files)}
                    maxImages={1}
                    objectFit="contain"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Store Name</Label>
                  <Input
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Support/Contact Email</Label>
                  <Input
                    value={storeEmail}
                    onChange={(e) => setStoreEmail(e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Support/Contact Phone</Label>
                  <Input
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Google Maps Link (Embed or URL)</Label>
                  <Input
                    value={storeMapLink}
                    onChange={(e) => setStoreMapLink(e.target.value)}
                    disabled={!isEditing}
                    placeholder="https://maps.google.com/..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Store Address</Label>
                <Textarea
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Store Description</Label>
                <Textarea
                  value={storeDescription}
                  onChange={(e) => setStoreDescription(e.target.value)}
                  disabled={!isEditing}
                  placeholder="A short description about your store for SEO/About sections"
                />
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Shipping Cost</Label>
                  <Input
                    type="number"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(Number(e.target.value))}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              {/* Settings that are specifically for the store but not general branding */}
            </>
          )}
        </CardContent>
      </Card>

      {/* Brand Data Reset */}
      <Card className="border-red-200 bg-red-50/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5 text-red-500" />
            <CardTitle className="text-red-600">Brand Data Reset</CardTitle>
          </div>
          <CardDescription>
            Reset all store branding and text content to Kay defaults.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This will overwrite your store name, email, addresses, and About
              Us text with the system defaults. This action is irreversible.
            </AlertDescription>
          </Alert>
          <div className="mt-6 flex justify-end">
            <Button
              variant="destructive"
              onClick={handleResetDefaults}
              disabled={resetDefaultsMutation.isPending}
              className="w-full md:w-auto"
            >
              {resetDefaultsMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Reset to Kay Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
          <CardDescription>
            Links to your store's social media pages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Facebook URL</Label>
              <Input
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="https://facebook.com/yourstore"
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label>Instagram URL</Label>
              <Input
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/yourstore"
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label>Twitter/X URL</Label>
              <Input
                value={twitterUrl}
                onChange={(e) => setTwitterUrl(e.target.value)}
                placeholder="https://twitter.com/yourstore"
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label>LinkedIn URL</Label>
              <Input
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/company/yourstore"
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label>YouTube URL</Label>
              <Input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/@yourstore"
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

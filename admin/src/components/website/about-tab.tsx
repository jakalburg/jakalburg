"use client";

import { useState, useEffect, useRef } from "react";
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
import { useGetAbout, useUpdateAbout } from "@/hooks/use-website-pages";
import { ImageUpload } from "@/components/products/image-upload";
import { uploadService } from "@/services/upload.service";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { toast } from "sonner";
import { Pencil, Trash2, Video as VideoIcon } from "lucide-react";

export function AboutTab() {
  const { data: aboutData, isLoading: isLoadingStore } = useGetAbout();
  const updateAboutMutation = useUpdateAbout();
  const api = useAxiosAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [aboutSubtitle, setAboutSubtitle] = useState("");
  const [aboutTitle, setAboutTitle] = useState("");
  const [aboutDescription, setAboutDescription] = useState("");
  const [aboutImageMain, setAboutImageMain] = useState<any[]>([]);
  const [aboutVideoMain, setAboutVideoMain] = useState("");
  const [aboutVideoFile, setAboutVideoFile] = useState<File | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [aboutImageSub, setAboutImageSub] = useState<any[]>([]);
  const [founderQuote, setFounderQuote] = useState("");
  const [founderText, setFounderText] = useState("");

  useEffect(() => {
    if (aboutData) {
      const about = aboutData;
      setAboutSubtitle(about.subtitle || "About us");
      setAboutTitle(about.title || "Crafting Elegance for Kay Store");
      setAboutDescription(
        about.description ||
          "Kay Store is a leading name in premium jewelry and artistic expressions, known for exceptional details and durability.\\nWe craft elegant rings, necklaces, bracelets, earrings, and custom pieces with precision and artistry. With expert craftsmanship and quality materials, we deliver jewelry designs that elevate every style with beauty and excellence.\\nKay Store stands for excellence, beautiful designs, and complete customer satisfaction.",
      );
      setAboutVideoMain(about.videoMain || "");
      setFounderQuote(about.founderQuote || "");
      setFounderText(about.founderText || "");

      setAboutImageMain([
        {
          id: "about-main",
          url:
            about.imageMain ||
            "https://res.cloudinary.com/diukjb3ma/image/upload/v1773759205/FRP%20Furniture%20and%20Decore/about_main.png",
          isPrimary: true,
        },
      ]);
      setAboutImageSub([
        {
          id: "about-sub",
          url:
            about.imageSub ||
            "https://res.cloudinary.com/diukjb3ma/image/upload/v1773752986/FRP%20Furniture%20and%20Decore/FAD_1.jpg",
          isPrimary: true,
        },
      ]);
    }
  }, [aboutData]);

  const handleCancel = () => {
    setIsEditing(false);
    if (aboutData) {
      const about = aboutData;
      setAboutSubtitle(about.subtitle || "About us");
      setAboutTitle(about.title || "Crafting Elegance for Nilkanth Art");
      setAboutDescription(
        about.description ||
          "Nilkanth Art is a leading name in premium FRP Temple and architectural creations, known for exceptional details and durability.\\nWe craft elegant FRP domes, ceilings, jalis, columns, sculpture, pots and decorative elements with precision and artistry. With expert craftsmanship and quality materials, we deliver FRP designs that elevate every space with beauty and excellence.\\nNilkanth Art stands for excellence, beautiful designs, durable performance, and complete customer satisfaction.",
      );
      setAboutVideoMain(about.videoMain || "");
      setAboutVideoFile(null);
      setFounderQuote(about.founderQuote || "");
      setFounderText(about.founderText || "");

      setAboutImageMain([
        {
          id: "about-main",
          url:
            about.imageMain ||
            "https://res.cloudinary.com/diukjb3ma/image/upload/v1773759205/FRP%20Furniture%20and%20Decore/about_main.png",
          isPrimary: true,
        },
      ]);
      setAboutImageSub([
        {
          id: "about-sub",
          url:
            about.imageSub ||
            "https://res.cloudinary.com/diukjb3ma/image/upload/v1773752986/FRP%20Furniture%20and%20Decore/FAD_1.jpg",
          isPrimary: true,
        },
      ]);
    }
  };

  const handleResetToDefault = () => {
    setAboutSubtitle("About us");
    setAboutTitle("Crafting Elegance for Kay Store");
    setAboutDescription(
      "Kay Store is a leading name in premium jewelry and artistic expressions, known for exceptional details and durability.\\nWe craft elegant rings, necklaces, bracelets, earrings, and custom pieces with precision and artistry. With expert craftsmanship and quality materials, we deliver jewelry designs that elevate every style with beauty and excellence.\\nKay Store stands for excellence, beautiful designs, and complete customer satisfaction.",
    );
    setAboutVideoMain("");
    setAboutVideoFile(null);
    setFounderQuote(
      "Every piece we create is a love letter — to craftsmanship, to women, and to the belief that jewellery should tell your story.",
    );
    setFounderText(
      "Kay was born out of a passion for timeless design and wearable art. We believe every woman deserves pieces that feel personal, intentional, and beautifully made.",
    );
    setAboutImageMain([
      {
        id: "about-main-def",
        url: "https://res.cloudinary.com/diukjb3ma/image/upload/v1773759205/FRP%20Furniture%20and%20Decore/about_main.png",
        isPrimary: true,
      },
    ]);
    setAboutImageSub([
      {
        id: "about-sub-def",
        url: "https://res.cloudinary.com/diukjb3ma/image/upload/v1773752986/FRP%20Furniture%20and%20Decore/FAD_1.jpg",
        isPrimary: true,
      },
    ]);

    toast.info("Defaults loaded in editor. Click Save to apply.");
  };

  const handleRemoveVideo = () => {
    setAboutVideoMain("");
    setAboutVideoFile(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  };

  const handleSaveAbout = async () => {
    try {
      let aboutImageMainUrl =
        aboutImageMain.length > 0 ? aboutImageMain[0].url : "";
      if (aboutImageMain.length > 0 && aboutImageMain[0].file) {
        const uploaded = await uploadService(api).uploadImage(
          aboutImageMain[0].file,
        );
        aboutImageMainUrl =
          uploaded.publicUrl || uploaded.url || uploaded.fileUrl;
      }

      let aboutVideoMainUrl = aboutVideoMain;
      if (aboutVideoFile) {
        const uploaded = await uploadService(api).uploadVideo(aboutVideoFile);
        aboutVideoMainUrl =
          uploaded.publicUrl || uploaded.fileUrl || uploaded.url || "";
      }

      let aboutImageSubUrl =
        aboutImageSub.length > 0 ? aboutImageSub[0].url : "";
      if (aboutImageSub.length > 0 && aboutImageSub[0].file) {
        const uploaded = await uploadService(api).uploadImage(
          aboutImageSub[0].file,
        );
        aboutImageSubUrl =
          uploaded.publicUrl || uploaded.url || uploaded.fileUrl;
      }

      updateAboutMutation.mutate(
        {
          subtitle: aboutSubtitle,
          title: aboutTitle,
          description: aboutDescription,
          imageMain: aboutImageMainUrl,
          videoMain: aboutVideoMainUrl,
          imageSub: aboutImageSubUrl,
          founderQuote,
          founderText,
        },
        {
          onSuccess: () => {
            setIsEditing(false);
            toast.success("About page settings saved successfully");
          },
        },
      );
    } catch {
      toast.error("Failed to upload images or save settings");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>About Us Content</CardTitle>
            <CardDescription>
              Manage the main text and imagery for the About section.
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
                <Button
                  variant="outline"
                  onClick={handleResetToDefault}
                  className="flex-1 sm:flex-none"
                  type="button"
                >
                  Load Defaults
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAbout}
                  disabled={updateAboutMutation.isPending}
                  className="flex-1 sm:flex-none"
                >
                  Save Configuration
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingStore ? (
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
                  <Label>About Subtitle</Label>
                  <Input
                    value={aboutSubtitle}
                    onChange={(e) => setAboutSubtitle(e.target.value)}
                    disabled={!isEditing}
                    placeholder="OUR PHILOSOPHY"
                  />
                </div>
                <div className="space-y-2">
                  <Label>About Title</Label>
                  <Input
                    value={aboutTitle}
                    onChange={(e) => setAboutTitle(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Crafting Elegance..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>About Description</Label>
                <Textarea
                  value={aboutDescription}
                  onChange={(e) => setAboutDescription(e.target.value)}
                  disabled={!isEditing}
                  rows={5}
                  placeholder="Full description for About section..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Founder Quote</Label>
                  <Input
                    value={founderQuote}
                    onChange={(e) => setFounderQuote(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Every piece we create is a love letter..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Founder Text</Label>
                  <Textarea
                    value={founderText}
                    onChange={(e) => setFounderText(e.target.value)}
                    disabled={!isEditing}
                    rows={2}
                    placeholder="Kay was born out of a passion..."
                  />
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label>Main Video (Optional - Takes Precedence)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    className="flex-1"
                    value={aboutVideoMain || ""}
                    onChange={(e) => {
                      setAboutVideoMain(e.target.value);
                      setAboutVideoFile(null);
                    }}
                    placeholder="https://...mp4"
                    disabled={!isEditing}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-6"
                    disabled={!isEditing}
                    onClick={() => videoInputRef.current?.click()}
                  >
                    <VideoIcon className="w-4 h-4 mr-2" />
                    Upload Video
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="px-6"
                    disabled={!isEditing || (!aboutVideoMain && !aboutVideoFile)}
                    onClick={handleRemoveVideo}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Video
                  </Button>
                </div>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  ref={videoInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (!file.type.startsWith("video/")) {
                        toast.error("Please select a valid video file.");
                        return;
                      }
                      setAboutVideoMain(URL.createObjectURL(file));
                      setAboutVideoFile(file);
                    }
                  }}
                />
                {aboutVideoMain && (
                  <div className="mt-3 h-40 w-full max-w-[300px] bg-muted rounded-lg overflow-hidden relative border shadow-sm">
                    <video
                      src={aboutVideoMain}
                      className="w-full h-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>About Main Image</Label>
                  <div
                    className={
                      !isEditing ? "opacity-50 pointer-events-none" : ""
                    }
                  >
                    <ImageUpload
                      images={aboutImageMain}
                      onChange={(files) => setAboutImageMain(files)}
                      maxImages={1}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>About Secondary Image (Small)</Label>
                  <div
                    className={
                      !isEditing ? "opacity-50 pointer-events-none" : ""
                    }
                  >
                    <ImageUpload
                      images={aboutImageSub}
                      onChange={(files) => setAboutImageSub(files)}
                      maxImages={1}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageForm from "@/components/pages/page-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Loader from "@/components/ui/loader";
import { ImageUpload } from "@/components/products/image-upload";
import { usePage } from "@/hooks/use-pages";
import { useGetAbout, useUpdateAbout } from "@/hooks/use-website-pages";
import { uploadService } from "@/services/upload.service";
import { realApi } from "@/lib/api/real-axios";

/** The About page's hero image lives on the WebsiteAbout singleton, not the
 *  Page record — rich text can't carry a full-bleed image. */
const ABOUT_SLUG = "about";

type HeroImage = { id: string; url: string; file?: File; isPrimary: boolean };

/**
 * Edit a storefront static page.
 *
 * The page is handed to PageForm as-is, `faqSections` included — the form
 * switches to the grouped FAQ editor when the slug is "faq" and uses the Quill
 * rich-text editor otherwise.
 *
 * The About page additionally gets a hero-image uploader; it saves to
 * /website/about alongside the page write, so the image that sits at the top
 * of the storefront /about screen is editable from right here.
 */
export default function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: page, isLoading } = usePage(id);

  const isAboutPage = page?.slug === ABOUT_SLUG;
  const { data: about } = useGetAbout({ enabled: isAboutPage });
  const updateAbout = useUpdateAbout();

  const [hero, setHero] = useState<HeroImage[]>([]);

  // Seed the uploader from the saved hero once it arrives.
  useEffect(() => {
    const url = about?.imageMain?.trim();
    setHero(url ? [{ id: "about-hero", url, isPrimary: true }] : []);
  }, [about?.imageMain]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Page not found</h2>
          <p className="text-muted-foreground mt-2 mb-4">
            The requested static page does not exist.
          </p>
          <Button asChild>
            <Link href="/website/pages">Back to Static Pages</Link>
          </Button>
        </div>
      </div>
    );
  }

  /** Uploads a newly picked hero and stores its URL on the About singleton. */
  const saveHero = async () => {
    const current = hero[0];
    const imageMain = current?.file
      ? ((await uploadService(realApi).uploadImage(current.file)).publicUrl ??
        "")
      : (current?.url ?? "");

    if (imageMain !== (about?.imageMain ?? "")) {
      await updateAbout.mutateAsync({ imageMain });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/pages/${id}`}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Page</h1>
          <p className="text-muted-foreground mt-1">
            Update static page content
          </p>
        </div>
      </div>

      <PageForm
        initialData={{
          id: page.id,
          title: page.title,
          slug: page.slug,
          content: page.content ?? "",
          status: page.status,
          faqSections: page.faqSections ?? null,
        }}
        isEdit
        extraSave={isAboutPage ? saveHero : undefined}
        extraFields={
          isAboutPage ? (
            <Card>
              <CardHeader>
                <CardTitle>Hero image</CardTitle>
                <CardDescription>
                  Shown full-width at the top of the storefront /about page.
                  Saved when you update the page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUpload
                  images={hero}
                  onChange={setHero}
                  maxImages={1}
                  replaceWhenFull
                  showPrimary={false}
                  objectFit="cover"
                  uploadLabel="Upload hero image"
                  inputId="about-hero-upload"
                />
              </CardContent>
            </Card>
          ) : null
        }
      />
    </div>
  );
}

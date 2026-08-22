"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { usePage } from "@/hooks/use-pages";
import { Button } from "@/components/ui/button";
import Loader from "@/components/ui/loader";
import PageForm from "@/components/pages/page-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/products/image-upload";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { uploadService } from "@/services/upload.service";

type FounderImageItem = {
  id: string;
  url: string;
  file?: File;
  isPrimary: boolean;
};

const founderImageMarkup = (imageUrl: string) =>
  imageUrl
    ? `<div class="founder-page__media"><img src="${imageUrl}" alt="Khushie - Founder of KAY by Khushie" /></div>`
    : "";

const extractFounderImage = (content: string) => {
  const founderImageMatch = content.match(
    /<div[^>]*class=["'][^"']*founder-page__media[^"']*["'][^>]*>[\s\S]*?<img[^>]+src=['"]([^'"]+)['"][^>]*>[\s\S]*?<\/div>/i,
  );

  if (founderImageMatch?.[1]) {
    return founderImageMatch[1];
  }

  const fallbackImageMatch = content.match(
    /<img[^>]+src=['"]([^'"]+)['"][^>]*>/i,
  );
  return fallbackImageMatch?.[1] || "";
};

const replaceFounderImage = (content: string, imageUrl: string) => {
  const mediaBlockPattern =
    /<div[^>]*class=["'][^"']*founder-page__media[^"']*["'][^>]*>[\s\S]*?<\/div>/i;
  const imageBlock = founderImageMarkup(imageUrl);

  if (mediaBlockPattern.test(content)) {
    if (!imageUrl) {
      return content.replace(mediaBlockPattern, "");
    }

    return content.replace(mediaBlockPattern, imageBlock);
  }

  if (!imageUrl) {
    return content;
  }

  if (
    /<div[^>]*class=["'][^"']*founder-page__hero[^"']*["'][^>]*>/i.test(content)
  ) {
    return content.replace(
      /<div[^>]*class=["'][^"']*founder-page__hero[^"']*["'][^>]*>/i,
      `$&${imageBlock}`,
    );
  }

  if (/<div[^>]*class=["'][^"']*founder-page[^"']*["'][^>]*>/i.test(content)) {
    return (
      content.replace(
        /<div[^>]*class=["'][^"']*founder-page[^"']*["'][^>]*>/i,
        `$&<div class="founder-page__hero">${imageBlock}<div class="founder-page__content">`,
      ) + "</div></div>"
    );
  }

  return `
    <div class="founder-page">
      <div class="founder-page__hero">
        ${imageBlock}
        <div class="founder-page__content">
          ${content}
        </div>
      </div>
    </div>
  `;
};

const removeFounderImageBlock = (content: string) =>
  content
    .replace(
      /<div[^>]*class=["'][^"']*founder-page__media[^"']*["'][^>]*>[\s\S]*?<\/div>/i,
      "",
    )
    .replace(/<img[^>]+src=['"]([^'"]+)['"][^>]*>/i, "");

const unwrapAboutBrandEssence = (content: string) =>
  content.replace(
    /<div[^>]*class=["'][^"']*about-page__brand-essence[^"']*["'][^>]*>\s*<div[^>]*class=["'][^"']*about-page__brand-essence-content[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*(?:<div[^>]*class=["'][^"']*about-page__brand-essence-media[^"']*["'][^>]*>[\s\S]*?<\/div>)?\s*<\/div>/i,
    "$1",
  );

const removeAboutBrandImageBlock = (content: string) =>
  unwrapAboutBrandEssence(content).replace(
    /<div[^>]*class=["'][^"']*about-page__brand-essence-media[^"']*["'][^>]*>[\s\S]*?<\/div>/i,
    "",
  );

export default function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: page, isLoading } = usePage(id);
  const api = useAxiosAuth();
  const [founderImageOverride, setFounderImageOverride] = useState<
    FounderImageItem[] | null
  >(null);

  const defaultFounderImage = useMemo<FounderImageItem[]>(() => {
    if (page?.slug !== "know-our-founder") {
      return [];
    }

    const imageUrl = extractFounderImage(page.content || "");

    return imageUrl
      ? [{ id: "founder-image", url: imageUrl, isPrimary: true }]
      : [];
  }, [page]);

  const founderImage = founderImageOverride ?? defaultFounderImage;

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

  const isFounderPage = page.slug === "know-our-founder";
  const isAboutPage = page.slug === "about-us";
  const pageFormData = isFounderPage
    ? { ...page, content: removeFounderImageBlock(page.content || "") }
    : isAboutPage
      ? { ...page, content: removeAboutBrandImageBlock(page.content || "") }
      : page;

  const transformValues = async (values: {
    title: string;
    slug: string;
    content: string;
    status: "active" | "inactive";
  }) => {
    if (!isFounderPage && !isAboutPage) {
      return values;
    }

    if (isAboutPage) {
      return {
        ...values,
        content: removeAboutBrandImageBlock(values.content),
      };
    }

    const current = founderImage[0];
    let imageUrl = "";

    if (current?.file) {
      const uploaded = await uploadService(api).uploadImage(current.file);
      imageUrl = uploaded.publicUrl || uploaded.url || uploaded.fileUrl || "";
    } else if (current?.url?.startsWith("http")) {
      imageUrl = current.url;
    }

    return {
      ...values,
      content: replaceFounderImage(values.content, imageUrl),
    };
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
        initialData={pageFormData}
        isEdit
        transformValues={transformValues}
        extraFields={
          isFounderPage ? (
            <Card>
              <CardHeader>
                <CardTitle>Founder Image</CardTitle>
              </CardHeader>
              <CardContent>
                <ImageUpload
                  images={founderImage}
                  onChange={setFounderImageOverride}
                  maxImages={1}
                  replaceWhenFull
                  showPrimary={false}
                  uploadLabel="Upload founder image"
                  inputId="founder-page-image-upload"
                />
              </CardContent>
            </Card>
          ) : null
        }
      />
    </div>
  );
}

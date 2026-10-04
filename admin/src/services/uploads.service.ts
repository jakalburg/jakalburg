import API_ENDPOINTS from "@/config/endpoints";
import { realApi } from "@/lib/api/real-axios";

// ---------------------------------------------------------------------------
// Uploads service — posts local image files to the real NestJS backend, which
// stores them in Cloudinary and returns their delivery URLs. Those URLs are
// then saved on Product.images[] (plain strings) by the product form.
//
// Goes through `realApi` (same instance as products), NOT the mock seam.
// ---------------------------------------------------------------------------

export interface UploadedImage {
  url: string;
  publicId: string;
}

export interface FailedUpload {
  fileName: string;
  error: string;
}

export interface ImageUploadResult {
  uploaded: UploadedImage[];
  failed: FailedUpload[];
  totalUploaded: number;
  totalFailed: number;
}

/**
 * Upload local image files to Cloudinary via the backend.
 *
 * The `realApi` instance defaults Content-Type to application/json, which would
 * make axios JSON-stringify the FormData. We override it to multipart/form-data
 * so axios passes the FormData through; the browser then supplies the boundary.
 */
export async function uploadProductImages(
  files: File[],
): Promise<ImageUploadResult> {
  const form = new FormData();
  for (const file of files) form.append("images", file);

  const res = await realApi.post<ImageUploadResult>(
    API_ENDPOINTS.uploads.images,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return res.data;
}

/**
 * Upload one image and return its Cloudinary URL.
 *
 * For the single-image config screens (footer background, feature images, hero
 * slides), which would otherwise each repeat the array-wrap and the failure
 * unwrapping. Throws on failure rather than returning "" — a caller that
 * silently saved an empty URL would look like it worked.
 *
 * Use THIS, not `uploadService(api).uploadImage` from `upload.service.ts`:
 * that one posts to `/media/image` on the injected axios, which is the mock
 * seam, and quietly returns a placehold.co URL.
 */
export async function uploadSingleImage(file: File): Promise<string> {
  const result = await uploadProductImages([file]);
  const url = result.uploaded[0]?.url;
  if (!url) {
    throw new Error(
      result.failed[0]?.error || "The image could not be uploaded.",
    );
  }
  return url;
}

/** Best-effort delete of a previously uploaded image by its Cloudinary URL. */
export async function deleteUploadedImage(url: string): Promise<void> {
  await realApi.delete(API_ENDPOINTS.uploads.deleteImage, { params: { url } });
}

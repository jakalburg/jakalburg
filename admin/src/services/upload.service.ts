import { AxiosInstance } from "axios";
import { reportError } from "@/lib/report-error";

export interface UploadResponse {
  id: string;
  url: string;
  publicUrl: string;
  fileUrl?: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface BulkUploadResponse {
  success: UploadResponse[];
  failed: Array<{ filename: string; error: string }>;
  totalUploaded: number;
  totalFailed: number;
}

export const uploadService = (api: AxiosInstance) => ({
  async uploadImage(file: File, productId?: string): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const url = productId
      ? `/media/image?productId=${productId}`
      : "/media/image";
    try {
      const response = await api.post<UploadResponse>(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        skipErrorReport: true,
      });
      return response.data;
    } catch (error: any) {
      reportError({
        message: error.response?.data?.message || error.message,
        errorType: "upload_failure",
        severity: "warning",
        statusCode: error.response?.status,
        // Never the file itself - only its size/type and where it failed.
        metadata: { fileSize: file.size, fileType: file.type, uploadStep: "image-upload" },
      });
      throw error;
    }
  },

  async uploadVideo(file: File, productId?: string): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const url = productId
      ? `/media/video?productId=${productId}`
      : "/media/video";
    try {
      const response = await api.post<UploadResponse>(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        skipErrorReport: true,
      });
      return response.data;
    } catch (error: any) {
      reportError({
        message: error.response?.data?.message || error.message,
        errorType: "upload_failure",
        severity: "warning",
        statusCode: error.response?.status,
        metadata: { fileSize: file.size, fileType: file.type, uploadStep: "video-upload" },
      });
      throw error;
    }
  },

  async uploadImages(
    files: File[],
    productId?: string,
  ): Promise<BulkUploadResponse> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const url = productId
      ? `/media/bulk?mediaType=image&productId=${productId}`
      : "/media/bulk?mediaType=image";

    try {
      const response = await api.post<BulkUploadResponse>(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        skipErrorReport: true,
      });
      return response.data;
    } catch (error: any) {
      reportError({
        message: error.response?.data?.message || error.message,
        errorType: "upload_failure",
        severity: "warning",
        statusCode: error.response?.status,
        metadata: {
          fileCount: files.length,
          totalSize: files.reduce((sum, f) => sum + f.size, 0),
          uploadStep: "bulk-image-upload",
        },
      });
      throw error;
    }
  },

  async deleteMedia(
    mediaId: string,
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/media/${mediaId}`);
    return response.data;
  },

  async deleteUpload(
    fileUrl: string,
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/media/url`, {
      params: { fileUrl },
    });
    return response.data;
  },
});

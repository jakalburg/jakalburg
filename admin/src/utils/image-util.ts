export const PLACEHOLDER_IMAGE_URL =
  "https://placehold.co/500x500?text=Not+Founde";

/**
 * Returns the image URL or a default placeholder if the image is missing.
 * @param {string | undefined | null} imgUrl - The source URL of the image.
 * @returns {string} - The valid image URL or the placeholder.
 */
export const getImageUrl = (imgUrl: string | undefined | null): string => {
  if (imgUrl && imgUrl.trim() !== "") {
    return imgUrl;
  }
  return PLACEHOLDER_IMAGE_URL;
};

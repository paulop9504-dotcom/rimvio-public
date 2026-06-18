/** Supabase Storage — shared bridge photos + videos (public read). */
export const EXPERIENCE_BRIDGE_MEDIA_BUCKET = "experience-bridge";

/** After client resize — Android gallery originals are often 8–15MB. */
export const BRIDGE_PHOTO_MAX_BYTES = 12 * 1024 * 1024;
/** Client-side ffmpeg trim/compress target ceiling before upload. */
export const BRIDGE_VIDEO_MAX_BYTES = 80 * 1024 * 1024;

export function formatBridgeMediaMaxMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

export const BRIDGE_PHOTO_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export const BRIDGE_VIDEO_CONTENT_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/3gpp",
  "video/3gpp2",
]);

export function isBridgePhotoContentType(contentType: string): boolean {
  return BRIDGE_PHOTO_CONTENT_TYPES.has(contentType.trim().toLowerCase());
}

export function isBridgeVideoContentType(contentType: string): boolean {
  return BRIDGE_VIDEO_CONTENT_TYPES.has(contentType.trim().toLowerCase());
}

export function isBridgeMediaContentType(contentType: string): boolean {
  const normalized = contentType.trim().toLowerCase();
  return (
    isBridgePhotoContentType(normalized) || isBridgeVideoContentType(normalized)
  );
}

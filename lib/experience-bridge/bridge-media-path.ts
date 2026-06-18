import {
  BRIDGE_PHOTO_MAX_BYTES,
  BRIDGE_VIDEO_MAX_BYTES,
  EXPERIENCE_BRIDGE_MEDIA_BUCKET,
  formatBridgeMediaMaxMb,
  isBridgePhotoContentType,
  isBridgeVideoContentType,
} from "@/lib/experience-bridge/bridge-media-constants";

/** Supabase Storage keys — ASCII [a-zA-Z0-9._-] only; colons/한글 event ids must encode. */
export function bridgeStorageSegment(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "unknown";
  }
  if (/^[a-zA-Z0-9._-]+$/.test(trimmed) && trimmed.length <= 180) {
    return trimmed;
  }
  return `e_${toBase64Url(trimmed)}`;
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  // Browser Buffer polyfill lacks base64url — always use base64 → url-safe.
  const base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function extensionForBridgeMediaContentType(contentType: string): string {
  const normalized = contentType.trim().toLowerCase();
  if (normalized.includes("png")) {
    return "png";
  }
  if (normalized.includes("webp")) {
    return "webp";
  }
  if (normalized.includes("heic")) {
    return "heic";
  }
  if (normalized.includes("heif")) {
    return "heif";
  }
  if (normalized.includes("quicktime")) {
    return "mov";
  }
  if (normalized.includes("webm")) {
    return "webm";
  }
  if (normalized.includes("3gpp2")) {
    return "3g2";
  }
  if (normalized.includes("3gpp")) {
    return "3gp";
  }
  if (normalized.startsWith("video/")) {
    return "mp4";
  }
  return "jpg";
}

export function bridgeMediaObjectPath(input: {
  userId: string;
  eventId: string;
  captureId: string;
  contentType: string;
}): string {
  const ext = extensionForBridgeMediaContentType(input.contentType);
  const eventKey = bridgeStorageSegment(input.eventId);
  const captureKey = bridgeStorageSegment(input.captureId);
  return `${input.userId}/bridge/${eventKey}/${captureKey}.${ext}`;
}

export function publicBridgeMediaUrl(
  supabaseUrl: string,
  objectPath: string,
): string {
  const base = supabaseUrl.replace(/\/$/, "");
  const segments = objectPath.split("/").map((part) => encodeURIComponent(part));
  return `${base}/storage/v1/object/public/${EXPERIENCE_BRIDGE_MEDIA_BUCKET}/${segments.join("/")}`;
}

export function assertBridgeCaptureSize(input: {
  byteLength: number;
  contentType: string;
}): void {
  const contentType = input.contentType.trim().toLowerCase() || "image/jpeg";
  const isPhoto = isBridgePhotoContentType(contentType);
  const isVideo = isBridgeVideoContentType(contentType);

  if (!isPhoto && !isVideo) {
    throw new Error("JPEG/PNG/WebP 사진 또는 MP4/MOV/WebM 동영상만 공유할 수 있어요.");
  }
  if (input.byteLength === 0) {
    throw new Error("미디어 파일이 비어 있어요.");
  }
  if (isPhoto && input.byteLength > BRIDGE_PHOTO_MAX_BYTES) {
    throw new Error(
      `${formatBridgeMediaMaxMb(BRIDGE_PHOTO_MAX_BYTES)} 이하 사진만 공유할 수 있어요.`,
    );
  }
  if (isVideo && input.byteLength > BRIDGE_VIDEO_MAX_BYTES) {
    throw new Error(
      `${formatBridgeMediaMaxMb(BRIDGE_VIDEO_MAX_BYTES)} 이하 동영상만 공유할 수 있어요.`,
    );
  }
}

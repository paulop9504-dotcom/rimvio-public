/** Caption placeholder when message is image-only (DB body NOT NULL). */
export const PEER_MESSAGE_IMAGE_PLACEHOLDER = "사진";

export const PEER_CHAT_IMAGE_BUCKET = "peer-chat";

export const PEER_CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const PEER_CHAT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

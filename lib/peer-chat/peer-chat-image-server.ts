import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PEER_CHAT_IMAGE_BUCKET,
  PEER_CHAT_IMAGE_MAX_BYTES,
  PEER_CHAT_IMAGE_TYPES,
} from "@/lib/peer-chat/peer-chat-image-constants";
import type { Database } from "@/types/database";

function extensionForContentType(contentType: string): string {
  if (contentType.includes("png")) {
    return "png";
  }
  if (contentType.includes("webp")) {
    return "webp";
  }
  return "jpg";
}

export function peerChatImageObjectPath(input: {
  userId: string;
  threadId: string;
  messageId: string;
  contentType: string;
}): string {
  const ext = extensionForContentType(input.contentType);
  return `${input.userId}/${input.threadId}/${input.messageId}.${ext}`;
}

export function publicPeerChatImageUrl(
  supabaseUrl: string,
  objectPath: string,
): string {
  const base = supabaseUrl.replace(/\/$/, "");
  const segments = objectPath.split("/").map((part) => encodeURIComponent(part));
  return `${base}/storage/v1/object/public/${PEER_CHAT_IMAGE_BUCKET}/${segments.join("/")}`;
}

export async function uploadPeerChatImage(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    threadId: string;
    supabaseUrl: string;
    bytes: Buffer;
    contentType: string;
  },
): Promise<{ messageId: string; imageUrl: string }> {
  const contentType = input.contentType?.trim() || "image/jpeg";
  if (!PEER_CHAT_IMAGE_TYPES.has(contentType)) {
    throw new Error("JPEG, PNG, WebP 사진만 보낼 수 있어요.");
  }
  if (input.bytes.byteLength > PEER_CHAT_IMAGE_MAX_BYTES) {
    throw new Error("5MB 이하 사진만 보낼 수 있어요.");
  }
  if (input.bytes.byteLength === 0) {
    throw new Error("사진 파일이 비어 있어요.");
  }

  const messageId = randomUUID();
  const objectPath = peerChatImageObjectPath({
    userId: input.userId,
    threadId: input.threadId,
    messageId,
    contentType,
  });

  const { error } = await supabase.storage
    .from(PEER_CHAT_IMAGE_BUCKET)
    .upload(objectPath, input.bytes, {
      upsert: false,
      contentType,
      cacheControl: "3600",
    });

  if (error) {
    throw error;
  }

  return {
    messageId,
    imageUrl: publicPeerChatImageUrl(input.supabaseUrl, objectPath),
  };
}

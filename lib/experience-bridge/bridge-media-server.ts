import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EXPERIENCE_BRIDGE_MEDIA_BUCKET } from "@/lib/experience-bridge/bridge-media-constants";
import {
  assertBridgeCaptureSize,
  bridgeMediaObjectPath,
  publicBridgeMediaUrl,
} from "@/lib/experience-bridge/bridge-media-path";
import type { Database } from "@/types/database";

export {
  assertBridgeCaptureSize,
  bridgeMediaObjectPath,
  extensionForBridgeMediaContentType,
  publicBridgeMediaUrl,
} from "@/lib/experience-bridge/bridge-media-path";

/** Upload local capture blob to public experience-bridge storage. */
export async function uploadBridgeCaptureMedia(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    eventId: string;
    captureId: string;
    supabaseUrl: string;
    bytes: Buffer;
    contentType: string;
  },
): Promise<{ mediaUrl: string }> {
  const contentType = input.contentType?.trim().toLowerCase() || "image/jpeg";
  assertBridgeCaptureSize({
    byteLength: input.bytes.byteLength,
    contentType,
  });

  const objectPath = bridgeMediaObjectPath({
    userId: input.userId,
    eventId: input.eventId,
    captureId: input.captureId || randomUUID(),
    contentType,
  });

  const { error } = await supabase.storage
    .from(EXPERIENCE_BRIDGE_MEDIA_BUCKET)
    .upload(objectPath, input.bytes, {
      upsert: true,
      contentType,
      cacheControl: "86400",
    });

  if (error) {
    throw error;
  }

  return {
    mediaUrl: publicBridgeMediaUrl(input.supabaseUrl, objectPath),
  };
}

export function parseBridgeMediaObjectPathFromUrl(
  url: string | undefined | null,
): string | null {
  const value = url?.trim();
  if (!value) {
    return null;
  }
  const marker = `/storage/v1/object/public/${EXPERIENCE_BRIDGE_MEDIA_BUCKET}/`;
  const index = value.indexOf(marker);
  if (index < 0) {
    return null;
  }
  const raw = value.slice(index + marker.length).split("?")[0]?.trim();
  if (!raw) {
    return null;
  }
  return raw
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .join("/");
}

/** Best-effort — remove shared bridge object (owner RLS). */
export async function deleteBridgeCaptureMediaFromStorage(
  supabase: SupabaseClient<Database>,
  input: { mediaUrl?: string | null },
): Promise<void> {
  const objectPath = parseBridgeMediaObjectPathFromUrl(input.mediaUrl);
  if (!objectPath) {
    return;
  }
  const { error } = await supabase.storage
    .from(EXPERIENCE_BRIDGE_MEDIA_BUCKET)
    .remove([objectPath]);
  if (error) {
    throw error;
  }
}

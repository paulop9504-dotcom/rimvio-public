"use client";

import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import {
  EXPERIENCE_BRIDGE_MEDIA_BUCKET,
} from "@/lib/experience-bridge/bridge-media-constants";
import {
  assertBridgeCaptureSize,
  bridgeMediaObjectPath,
  publicBridgeMediaUrl,
} from "@/lib/experience-bridge/bridge-media-path";
import { isUsableBridgeMediaUrl } from "@/lib/experience-bridge/bridge-media-url";
import { prepareBridgeCaptureBlob } from "@/lib/experience-bridge/prepare-bridge-capture-blob";
import { readMediaBlob } from "@/lib/location-ping/media-blob-store";
import { createClient } from "@/lib/supabase/client";
import {
  RIMVIO_SUPABASE_URL,
} from "@/lib/supabase/rimvio-supabase-public";

function resolveBridgeCaptureFileMeta(input: {
  blob: Blob;
  capture: FeedCaptureFragment;
}): { ext: string; contentType: string } {
  const type = input.blob.type.trim().toLowerCase();
  const isVideo =
    input.capture.kind === "video" || type.startsWith("video/");

  if (isVideo) {
    if (type.includes("quicktime")) {
      return { ext: "mov", contentType: type || "video/quicktime" };
    }
    if (type.includes("webm")) {
      return { ext: "webm", contentType: type || "video/webm" };
    }
    if (type.includes("3gpp2")) {
      return { ext: "3g2", contentType: type || "video/3gpp2" };
    }
    if (type.includes("3gpp")) {
      return { ext: "3gp", contentType: type || "video/3gpp" };
    }
    return { ext: "mp4", contentType: type || "video/mp4" };
  }

  if (type.includes("png")) {
    return { ext: "png", contentType: type || "image/png" };
  }
  if (type.includes("webp")) {
    return { ext: "webp", contentType: type || "image/webp" };
  }
  if (type.includes("heic")) {
    return { ext: "heic", contentType: type || "image/heic" };
  }
  if (type.includes("heif")) {
    return { ext: "heif", contentType: type || "image/heif" };
  }
  return { ext: "jpg", contentType: type || "image/jpeg" };
}

function resolveSupabasePublicUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return RIMVIO_SUPABASE_URL;
}

/** Upload local capture blob directly to Supabase Storage (bypasses Vercel 4.5MB limit). */
export async function uploadBridgeCaptureBlob(input: {
  eventId: string;
  capture: FeedCaptureFragment;
}): Promise<string | null> {
  if (isUsableBridgeMediaUrl(input.capture.url)) {
    return input.capture.url!.trim();
  }

  const mediaId = input.capture.mediaContextId?.trim();
  if (!mediaId) {
    throw new Error("공유할 미디어를 찾지 못했어요. 사진·동영상을 다시 붙여 주세요.");
  }

  const rawBlob = await readMediaBlob(mediaId);
  if (!rawBlob || rawBlob.size === 0) {
    throw new Error(
      "기기에 저장된 미디어를 찾지 못했어요. 같은 사진·동영상을 다시 추가해 주세요.",
    );
  }

  const blob = await prepareBridgeCaptureBlob({
    blob: rawBlob,
    capture: input.capture,
  });

  const { contentType } = resolveBridgeCaptureFileMeta({
    blob,
    capture: input.capture,
  });
  assertBridgeCaptureSize({
    byteLength: blob.size,
    contentType,
  });

  const supabase = createClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (sessionError || !userId) {
    throw new Error("로그인 후에 공유할 수 있어요.");
  }

  const objectPath = bridgeMediaObjectPath({
    userId,
    eventId: input.eventId,
    captureId: input.capture.id,
    contentType,
  });

  const { error: uploadError } = await supabase.storage
    .from(EXPERIENCE_BRIDGE_MEDIA_BUCKET)
    .upload(objectPath, blob, {
      upsert: true,
      contentType,
      cacheControl: "86400",
    });

  if (uploadError) {
    const message = uploadError.message?.trim() || "";
    if (/invalid key/i.test(message)) {
      throw new Error("공유 경로 오류 — 다시 시도해 주세요.");
    }
    throw new Error(message || "미디어 업로드에 실패했어요.");
  }

  return publicBridgeMediaUrl(resolveSupabasePublicUrl(), objectPath);
}

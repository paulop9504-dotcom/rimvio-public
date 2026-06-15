"use client";

import { prepareCaptureImageForUpload } from "@/lib/capture/prepare-capture-image";
import {
  BRIDGE_PHOTO_MAX_BYTES,
  BRIDGE_VIDEO_MAX_BYTES,
  formatBridgeMediaMaxMb,
} from "@/lib/experience-bridge/bridge-media-constants";
import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import { prepareShareVideoFile } from "@/lib/media/share-video-compress/prepare-share-video-file";

function captureBaseName(capture: FeedCaptureFragment): string {
  return capture.id.trim() || "bridge-media";
}

function isVideoCapture(
  capture: FeedCaptureFragment,
  blob: Blob,
): boolean {
  if (capture.kind === "video") {
    return true;
  }
  return blob.type.trim().toLowerCase().startsWith("video/");
}

/** Fit local blob to bridge storage limits before server upload. */
export async function prepareBridgeCaptureBlob(input: {
  blob: Blob;
  capture: FeedCaptureFragment;
}): Promise<Blob> {
  const { blob, capture } = input;
  if (blob.size === 0) {
    throw new Error("미디어 파일이 비어 있어요. 다시 선택해 주세요.");
  }

  if (isVideoCapture(capture, blob)) {
    if (blob.size <= BRIDGE_VIDEO_MAX_BYTES) {
      return blob;
    }
    const sourceFile = new File(
      [blob],
      `${captureBaseName(capture)}.mp4`,
      { type: blob.type || "video/mp4" },
    );
    const compressed = await prepareShareVideoFile({ file: sourceFile });
    if (compressed.size === 0) {
      throw new Error("동영상 압축에 실패했어요. 더 짧은 동영상을 선택해 주세요.");
    }
    if (compressed.size > BRIDGE_VIDEO_MAX_BYTES) {
      throw new Error(
        `${formatBridgeMediaMaxMb(BRIDGE_VIDEO_MAX_BYTES)} 이하 동영상만 공유할 수 있어요.`,
      );
    }
    return compressed;
  }

  const sourceFile = new File(
    [blob],
    `${captureBaseName(capture)}.jpg`,
    { type: blob.type || "image/jpeg" },
  );
  const prepared = await prepareCaptureImageForUpload(sourceFile);
  if (prepared.size === 0) {
    throw new Error("사진을 준비하지 못했어요. 다시 선택해 주세요.");
  }
  if (prepared.size > BRIDGE_PHOTO_MAX_BYTES) {
    throw new Error(
      `${formatBridgeMediaMaxMb(BRIDGE_PHOTO_MAX_BYTES)} 이하 사진만 공유할 수 있어요. 더 작은 사진을 선택해 주세요.`,
    );
  }
  return prepared;
}

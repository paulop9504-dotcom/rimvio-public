"use client";

import {
  BRIDGE_VIDEO_MAX_BYTES,
  formatBridgeMediaMaxMb,
} from "@/lib/experience-bridge/bridge-media-constants";
import { compressShareVideoFile } from "@/lib/media/share-video-compress/compress-share-video-file";
import { SHARE_VIDEO_MAX_DURATION_SEC } from "@/lib/media/share-video-compress/constants";
import { readVideoDurationSec } from "@/lib/media/share-video-compress/read-video-duration-sec";
import { shouldCompressShareVideo } from "@/lib/media/share-video-compress/should-compress-share-video";

export type ShareVideoPrepareProgress = {
  phase: "loading" | "compressing";
  ratio?: number;
};

export async function prepareShareVideoFile(input: {
  file: File;
  onProgress?: (progress: ShareVideoPrepareProgress) => void;
}): Promise<File> {
  const durationSec = await readVideoDurationSec(input.file);
  const needsDurationTrim =
    durationSec != null && durationSec > SHARE_VIDEO_MAX_DURATION_SEC + 0.5;

  if (
    !shouldCompressShareVideo({
      file: input.file,
      sizeBytes: input.file.size,
      durationSec,
    })
  ) {
    return input.file;
  }

  if (typeof window === "undefined") {
    return input.file;
  }

  try {
    input.onProgress?.({ phase: "loading" });
    const compressed = await compressShareVideoFile(input.file, {
      onProgress: (ratio) => {
        input.onProgress?.({ phase: "compressing", ratio });
      },
    });

    if (
      compressed.size < input.file.size ||
      input.file.type.trim().toLowerCase() !== "video/mp4" ||
      needsDurationTrim
    ) {
      return compressed;
    }

    return input.file;
  } catch (caught) {
    if (input.file.size > BRIDGE_VIDEO_MAX_BYTES) {
      const message =
        caught instanceof Error
          ? caught.message
          : "동영상 압축에 실패했어요.";
      throw new Error(
        `${message} ${formatBridgeMediaMaxMb(BRIDGE_VIDEO_MAX_BYTES)} 이하·2분 이내 동영상을 선택하거나 Wi-Fi에서 다시 시도해 주세요.`,
      );
    }
    console.warn("[share-video-compress] fallback to original", caught);
    return input.file;
  }
}

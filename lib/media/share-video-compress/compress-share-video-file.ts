"use client";

import { fetchFile } from "@ffmpeg/util";
import {
  SHARE_VIDEO_CRF_STEPS,
  SHARE_VIDEO_MAX_DURATION_SEC,
  SHARE_VIDEO_MAX_HEIGHT,
  SHARE_VIDEO_MAX_WIDTH,
  SHARE_VIDEO_TARGET_MAX_BYTES,
} from "@/lib/media/share-video-compress/constants";
import { loadShareFfmpeg } from "@/lib/media/share-video-compress/load-share-ffmpeg";
import { runShareVideoCompressSerial } from "@/lib/media/share-video-compress/run-share-video-compress-serial";

function inputExt(file: File): string {
  const match = file.name.trim().match(/\.([a-z0-9]+)$/iu);
  if (match?.[1]) {
    return match[1].toLowerCase();
  }
  const type = file.type.trim().toLowerCase();
  if (type.includes("quicktime")) {
    return "mov";
  }
  if (type.includes("webm")) {
    return "webm";
  }
  return "mp4";
}

function outputBaseName(file: File): string {
  const trimmed = file.name.trim();
  if (!trimmed) {
    return "rimvio-share";
  }
  return trimmed.replace(/\.[^.]+$/u, "") || "rimvio-share";
}

const SCALE_FILTER = `scale=w='min(${SHARE_VIDEO_MAX_WIDTH},iw)':h='min(${SHARE_VIDEO_MAX_HEIGHT},ih)':force_original_aspect_ratio=decrease`;

export async function compressShareVideoFile(
  file: File,
  input?: {
    onProgress?: (ratio: number) => void;
  },
): Promise<File> {
  return runShareVideoCompressSerial(async () => {
    const ffmpeg = await loadShareFfmpeg();
    const inputName = `in-${crypto.randomUUID()}.${inputExt(file)}`;
    const outputName = `out-${crypto.randomUUID()}.mp4`;
    const progressHandler = ({ progress }: { progress: number }) => {
      if (Number.isFinite(progress) && progress >= 0 && progress <= 1) {
        input?.onProgress?.(progress);
      }
    };

    ffmpeg.on("progress", progressHandler);

    try {
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      let bestBlob: Blob | null = null;

      for (const crf of SHARE_VIDEO_CRF_STEPS) {
        await ffmpeg.exec([
          "-i",
          inputName,
          "-t",
          String(SHARE_VIDEO_MAX_DURATION_SEC),
          "-vf",
          SCALE_FILTER,
          "-c:v",
          "libx264",
          "-preset",
          "fast",
          "-crf",
          String(crf),
          "-c:a",
          "aac",
          "-b:a",
          "96k",
          "-movflags",
          "+faststart",
          "-y",
          outputName,
        ]);

        const data = await ffmpeg.readFile(outputName);
        const bytes =
          data instanceof Uint8Array
            ? data
            : new TextEncoder().encode(String(data));
        const blob = new Blob([bytes], { type: "video/mp4" });
        bestBlob = blob;

        if (blob.size <= SHARE_VIDEO_TARGET_MAX_BYTES) {
          break;
        }
      }

      if (!bestBlob || bestBlob.size === 0) {
        throw new Error("압축된 동영상이 비어 있어요.");
      }

      return new File([bestBlob], `${outputBaseName(file)}.mp4`, {
        type: "video/mp4",
      });
    } finally {
      ffmpeg.off("progress", progressHandler);
      try {
        await ffmpeg.deleteFile(inputName);
      } catch {
        // ignore cleanup
      }
      try {
        await ffmpeg.deleteFile(outputName);
      } catch {
        // ignore cleanup
      }
    }
  });
}

"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { FFMPEG_CORE_CDN_VERSION } from "@/lib/media/share-video-compress/constants";

let ffmpegPromise: Promise<FFmpeg> | null = null;

export async function loadShareFfmpeg(): Promise<FFmpeg> {
  if (typeof window === "undefined") {
    throw new Error("동영상 압축은 브라우저에서만 가능해요.");
  }

  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg();
      const baseURL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_CDN_VERSION}/dist/esm`;
      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          "text/javascript",
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm",
        ),
      });
      return ffmpeg;
    })();
  }

  return ffmpegPromise;
}

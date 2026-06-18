"use client";

import { attachMediaSpacetime } from "@/lib/location-ping/attach-media-spacetime";
import { saveMediaSpacetimeContext } from "@/lib/location-ping/media-context-store";
import type { MediaSpacetimeContext } from "@/lib/location-ping/types";
import {
  MEDIA_POOL_ORIGIN_REF,
  MEDIA_POOL_RETENTION_MS,
} from "@/lib/media-pool/media-pool-constants";

export type StageMediaToPoolResult = {
  context: MediaSpacetimeContext;
  toastLine: string;
};

/** Store GPS-less capture locally — time exact, place approximate, 7-day TTL. */
export async function stageMediaToPool(input: {
  file: File;
  onFilePrepare?: (message: string) => void;
}): Promise<StageMediaToPoolResult> {
  const base = await attachMediaSpacetime({
    file: input.file,
    origin: "media_pool",
    originRef: MEDIA_POOL_ORIGIN_REF,
    onFilePrepare: input.onFilePrepare,
  });

  const staged: MediaSpacetimeContext = {
    ...base,
    poolStatus: "staged",
    expiresAtIso: new Date(Date.now() + MEDIA_POOL_RETENTION_MS).toISOString(),
  };

  await saveMediaSpacetimeContext(staged);

  const noun = staged.mediaKind === "video" ? "동영상" : "사진";
  return {
    context: staged,
    toastLine: `${noun} 보관함에 넣었어요 · 맥락은 나중에 만들 수 있어요`,
  };
}

/** Stage many files — returns per-item outcomes. */
export async function stageMediaToPoolBulk(input: {
  files: File[];
  onProgress?: (done: number, total: number) => void;
  onFilePrepare?: (message: string) => void;
}): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  toastLine: string;
  contexts: MediaSpacetimeContext[];
}> {
  const files = input.files;
  const contexts: MediaSpacetimeContext[] = [];
  let failed = 0;

  for (let index = 0; index < files.length; index += 1) {
    try {
      const outcome = await stageMediaToPool({
        file: files[index]!,
        onFilePrepare: input.onFilePrepare,
      });
      contexts.push(outcome.context);
    } catch {
      failed += 1;
    }
    input.onProgress?.(index + 1, files.length);
  }

  const succeeded = contexts.length;
  let toastLine = "사진·동영상 보관함에 넣었어요";
  if (succeeded === 0) {
    toastLine = failed > 0 ? "보관함에 넣지 못했어요" : "올릴 파일이 없어요";
  } else if (succeeded === 1) {
    toastLine = contexts[0]!.mediaKind === "video"
      ? "동영상 보관함에 넣었어요 · 맥락은 나중에"
      : "사진 보관함에 넣었어요 · 맥락은 나중에";
  } else if (failed > 0) {
    toastLine = `${succeeded}개 보관 · ${failed}개 실패`;
  } else {
    toastLine = `사진·동영상 ${succeeded}개 보관함에 넣었어요`;
  }

  return {
    total: files.length,
    succeeded,
    failed,
    toastLine,
    contexts,
  };
}

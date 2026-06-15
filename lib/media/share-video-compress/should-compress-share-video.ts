import { SHARE_VIDEO_SKIP_BELOW_BYTES, SHARE_VIDEO_MAX_DURATION_SEC } from "@/lib/media/share-video-compress/constants";

const VIDEO_EXT =
  /\.(mp4|mov|m4v|webm|mkv|avi|3gp|3g2|qt|mpeg|mpg)$/iu;

export function isShareVideoFile(file: Pick<File, "type" | "name">): boolean {
  const type = file.type.trim().toLowerCase();
  if (type.startsWith("video/")) {
    return true;
  }
  if (!type) {
    return VIDEO_EXT.test(file.name.trim().toLowerCase());
  }
  return false;
}

export function shouldCompressShareVideo(input: {
  file: Pick<File, "type" | "name">;
  sizeBytes?: number;
  durationSec?: number | null;
}): boolean {
  if (!isShareVideoFile(input.file)) {
    return false;
  }

  if (
    input.durationSec != null &&
    input.durationSec > SHARE_VIDEO_MAX_DURATION_SEC + 0.5
  ) {
    return true;
  }

  const size = input.sizeBytes ?? 0;
  const type = input.file.type.trim().toLowerCase();

  if (size > SHARE_VIDEO_SKIP_BELOW_BYTES) {
    return true;
  }

  if (type && type !== "video/mp4") {
    return true;
  }

  const name = input.file.name.trim().toLowerCase();
  if (name && !name.endsWith(".mp4")) {
    return true;
  }

  return false;
}

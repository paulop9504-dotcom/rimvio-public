import assert from "node:assert/strict";
import { SHARE_VIDEO_MAX_DURATION_SEC, SHARE_VIDEO_SKIP_BELOW_BYTES } from "@/lib/media/share-video-compress/constants";
import {
  isShareVideoFile,
  shouldCompressShareVideo,
} from "@/lib/media/share-video-compress/should-compress-share-video";

function file(name: string, type: string, size = 0): File {
  return { name, type, size } as File;
}

assert.equal(isShareVideoFile(file("clip.MOV", "video/quicktime")), true);
assert.equal(isShareVideoFile(file("photo.jpg", "image/jpeg")), false);
assert.equal(isShareVideoFile(file("clip.mp4", "")), true);

assert.equal(
  shouldCompressShareVideo({
    file: file("big.mp4", "video/mp4"),
    sizeBytes: SHARE_VIDEO_SKIP_BELOW_BYTES + 1,
  }),
  true,
);

assert.equal(
  shouldCompressShareVideo({
    file: file("small.mp4", "video/mp4"),
    sizeBytes: 1024 * 1024,
  }),
  false,
);

assert.equal(
  shouldCompressShareVideo({
    file: file("iphone.MOV", "video/quicktime"),
    sizeBytes: 1024 * 1024,
  }),
  true,
);

assert.equal(
  shouldCompressShareVideo({
    file: file("clip.webm", "video/webm"),
    sizeBytes: 1024,
  }),
  true,
);

assert.equal(
  shouldCompressShareVideo({
    file: file("long.mp4", "video/mp4"),
    sizeBytes: 1024 * 1024,
    durationSec: SHARE_VIDEO_MAX_DURATION_SEC + 30,
  }),
  true,
);

assert.equal(
  shouldCompressShareVideo({
    file: file("short.mp4", "video/mp4"),
    sizeBytes: 1024 * 1024,
    durationSec: 45,
  }),
  false,
);

console.log("test-share-video-compress: ok");

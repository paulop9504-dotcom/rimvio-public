#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { parseBridgeMediaObjectPathFromUrl } from "../lib/experience-bridge/bridge-media-server";
import {
  canViewerDeleteBridgeMediaItem,
  resolveReelItemCaptureId,
} from "../lib/globe/resolve-reel-item-capture-id";
import type { ContextMediaReelItem } from "../lib/globe/project-context-media-reel";

const item: ContextMediaReelItem = {
  id: "capture:abc-123",
  label: "사진",
  recallCaption: "작년 여름 · 사진",
  placeLabel: null,
  imageUrl: "https://x.test/storage/v1/object/public/experience-bridge/u1/bridge/e1/c1.jpg",
  mediaContextId: "abc-123",
  capturedAtIso: "2026-01-01T00:00:00.000Z",
  kind: "photo",
  ownerUserId: "user-a",
};

assert.equal(resolveReelItemCaptureId(item), "abc-123");
assert.equal(canViewerDeleteBridgeMediaItem({ item, viewerUserId: "user-a" }), true);
assert.equal(canViewerDeleteBridgeMediaItem({ item, viewerUserId: "user-b" }), false);

const path = parseBridgeMediaObjectPathFromUrl(item.imageUrl);
assert.equal(path, "u1/bridge/e1/c1.jpg");

console.log("test-bridge-media-delete: ok");

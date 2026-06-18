#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "@/lib/events/event-store";
import { ingestPeerTalkMarble } from "@/lib/inside-out/marble-ingest";
import { deriveUserCoreActionLabel } from "@/lib/inside-out/user-core-action-label";
import { buildSurfacesFromLife } from "@/lib/surface-engine/surface-builder";
import { readLifeProjections } from "@/lib/life-read-model/read-life-projections";
import { deriveSurfaceWhyLineKo } from "@/lib/surface-composition/surface-why-copy";
import { resolveSurfaces } from "@/lib/surface-engine/surface-resolver";

resetEventCandidatesForTests([]);

const marble = ingestPeerTalkMarble({
  body: "다음 달 오사카 여행 약속 잡았어 3월 첫째 주",
  peerThreadId: "peer-thread-test-1",
  messageId: "msg-1",
  displayName: "민수",
});

assert.ok(marble, "peer talk travel line should create a marble");
assert.equal(marble?.metadata?.channel, "peer_talk");
assert.match(marble?.title ?? "", /오사카|여행/u);

const label = deriveUserCoreActionLabel(marble!);
assert.ok(label && label.length >= 2, "core label from user note");

const life = readLifeProjections();
const surfaces = buildSurfacesFromLife(life, { now: new Date() });
const ecSurface = surfaces.find((s) => s.id === `surface:ec:${marble!.id}`);
assert.ok(ecSurface, "surface built from marble");
assert.match(ecSurface!.primaryAction.label, /오사카|여행/u);
assert.equal(ecSurface!.narration?.reason, "peer_talk_marble");

const why = deriveSurfaceWhyLineKo({
  node: ecSurface as import("@/lib/surface-composition/surface-node-contract").SurfaceNode,
});
assert.match(why ?? "", /대화/u);

const frame = resolveSurfaces();
const feedPrimary = frame.surfaces.find((s) => s.id === ecSurface!.id);
assert.ok(feedPrimary, "ranked surface exists");

console.log("test-inside-out-p0: ok");

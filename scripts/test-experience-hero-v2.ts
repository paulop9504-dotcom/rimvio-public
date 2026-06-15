#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { buildExperienceGraphFromEvents } from "../lib/experience-graph";
import { EVIDENCE_ORDER, projectEvidenceSummary } from "../lib/globe/project-evidence-summary";
import { projectExperienceHeroFromEvent } from "../lib/globe/project-experience-hero";
import {
  projectRepresentativeMoments,
  representativeMomentLabels,
} from "../lib/globe/project-representative-moments";
import { projectExperienceConversation } from "../lib/globe/project-experience-conversation";
import { projectExperienceRoom } from "../lib/experience-room/project-experience-room";

const wedding: EventCandidate = {
  id: "ec-wedding-hero",
  title: "민수 결혼식",
  category: "travel",
  source: "message",
  lifecycle: "completed",
  datetime: "2027-04-12T15:00:00+09:00",
  place: "서울 강남",
  confidence: 0.9,
  metadata: {
    feedPlanEnabled: true,
    planPeerThreadId: "peer-wedding-group",
    planPeerDisplayName: "민수",
    peerMessageCount: 26,
    attendees: Array.from({ length: 47 }, (_, index) => `guest-${index}`),
    experienceConversationSnippets: [
      { speakerName: "혜진", body: "사진 진짜 잘 나왔다" },
      { speakerName: "민수", body: "다들 와줘서 고마워" },
      { speakerName: "철수", body: "축가 영상 올렸어" },
      ...Array.from({ length: 23 }, (_, index) => ({
        speakerName: `guest-${index}`,
        body: `대화 ${index + 1}`,
      })),
    ],
    feedCaptures: [
      {
        id: "photo-1",
        kind: "photo",
        label: "신부 입장",
        capturedAtIso: "2027-04-12T16:00:00+09:00",
      },
      {
        id: "photo-2",
        kind: "photo",
        label: "단체 사진",
        capturedAtIso: "2027-04-12T16:30:00+09:00",
      },
      {
        id: "video-1",
        kind: "video",
        label: "축가",
        capturedAtIso: "2027-04-12T17:00:00+09:00",
      },
      ...Array.from({ length: 126 }, (_, index) => ({
        id: `photo-extra-${index}`,
        kind: "photo" as const,
        capturedAtIso: "2027-04-12T18:00:00+09:00",
      })),
      ...Array.from({ length: 13 }, (_, index) => ({
        id: `video-extra-${index}`,
        kind: "video" as const,
        capturedAtIso: "2027-04-12T18:30:00+09:00",
      })),
      { id: "link-1", kind: "link" as const, capturedAtIso: "2027-04-12T19:00:00+09:00" },
      { id: "memo-1", kind: "memo" as const, capturedAtIso: "2027-04-12T19:10:00+09:00" },
    ],
  },
  lifecycleUpdatedAt: "2027-04-13T00:00:00.000Z",
  createdAt: "2027-04-01T00:00:00.000Z",
  updatedAt: "2027-04-13T00:00:00.000Z",
};

const graph = buildExperienceGraphFromEvents([wedding]);
const volume = graph.volumes[0]!;

const hero = projectExperienceHeroFromEvent({
  event: wedding,
  volume,
  allEvents: [wedding],
});

assert.ok(hero);
assert.equal(hero!.title, "민수 결혼식");
assert.equal(hero!.date, "2027.04.12");
assert.equal(hero!.place, "서울 강남");
assert.equal(hero!.peopleCount, 48);
assert.equal(hero!.photoCount, 128);
assert.equal(hero!.videoCount, 14);

const moments = representativeMomentLabels({ event: wedding, volume });
assert.deepEqual(moments.slice(0, 3), ["신부 입장", "단체 사진", "축가"]);

const rows = projectEvidenceSummary({ event: wedding, volume });
assert.deepEqual(
  rows.map((row) => row.kind),
  [...EVIDENCE_ORDER],
);
assert.equal(rows.find((row) => row.kind === "photo")!.count, 128);
assert.ok(!rows.some((row) => row.kind === "people" || row.kind === "chat"));

const room = projectExperienceRoom({ primaryEvent: wedding });
const conversation = projectExperienceConversation({
  event: wedding,
  participants: room.participants,
});
assert.ok(conversation);
assert.equal(conversation!.previews[0]!.speakerName, "혜진");
assert.equal(conversation!.previews[0]!.excerpt, "사진 진짜 잘 나왔다");
assert.equal(conversation!.overflowCount, 23);

const rep = projectRepresentativeMoments({ event: wedding, volume });
assert.equal(rep[0]!.source, "capture");
assert.equal(rep[0]!.label, "신부 입장");

console.log("test-experience-hero-v2: ok");

#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  buildExperienceRoomHref,
  projectExperienceConversation,
} from "../lib/globe/project-experience-conversation";
import { EVIDENCE_ORDER } from "../lib/globe/project-evidence-summary";

const event: EventCandidate = {
  id: "ec-conv",
  title: "민수 결혼식",
  category: "travel",
  source: "message",
  lifecycle: "completed",
  datetime: "2027-04-12T15:00:00+09:00",
  place: "서울 강남",
  confidence: 0.9,
  metadata: {
    feedPlanEnabled: true,
    planPeerThreadId: "peer-wedding",
    experienceConversationSnippets: [
      { speakerName: "혜진", body: "사진 진짜 잘 나왔다" },
      { speakerName: "민수", body: "다들 와줘서 고마워" },
    ],
    peerMessageCount: 5,
  },
  lifecycleUpdatedAt: "2027-04-13T00:00:00.000Z",
  createdAt: "2027-04-01T00:00:00.000Z",
  updatedAt: "2027-04-13T00:00:00.000Z",
};

const conversation = projectExperienceConversation({ event });
assert.ok(conversation);
assert.equal(conversation!.peerThreadId, "peer-wedding");
assert.equal(conversation!.previews.length, 2);
assert.equal(conversation!.overflowCount, 3);

const href = buildExperienceRoomHref({
  peerThreadId: "peer-wedding",
  eventId: "ec-conv",
  title: "민수 결혼식",
  date: "2027.04.12",
  place: "서울 강남",
});
assert.ok(href.includes("experienceTitle=%EB%AF%BC%EC%88%98"));
assert.ok(href.includes("experienceDate=2027.04.12"));

assert.deepEqual(EVIDENCE_ORDER, [
  "photo",
  "video",
  "gps",
  "schedule",
  "link",
  "memo",
]);

console.log("test-experience-conversation: ok");

#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { prepareScheduleConfirmDraft } from "../lib/peer-chat/ai-lens/prepare-schedule-confirm";
import { resolvePlanAttach } from "../lib/plan-context/resolve-plan-attach";
import { resolveScheduleTrustZone } from "../lib/plan-context/resolve-schedule-trust-zone";
import { fastCommitScheduleDraft } from "../lib/peer-chat/ai-lens/fast-commit-schedule-draft";
import { undoLensScheduleCommit } from "../lib/peer-chat/ai-lens/undo-lens-schedule-commit";
import type { EventCandidate } from "../lib/events/event-candidate";
import type { DeepLinkBubbleCandidate } from "../lib/peer-chat/ai-lens/types";
import {
  findEventCandidate,
  listEventCandidates,
  resetEventCandidatesForTests,
} from "../lib/events/event-store";

const futureIso = "2027-06-12T09:00:00+09:00";
const futureEndIso = "2027-06-15T18:00:00+09:00";

const planEvent: EventCandidate = {
  id: "plan-jeju",
  title: "제주 여행",
  category: "travel",
  source: "peer_chat",
  lifecycle: "active",
  datetime: futureIso,
  place: "제주",
  metadata: {
    feedPlanEnabled: true,
    planKind: "plan",
    planWindowEndIso: futureEndIso,
    planPeerDisplayName: "민수",
  },
  confidence: 0.9,
  lifecycleUpdatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

resetEventCandidatesForTests([planEvent]);

const weakAttach = resolvePlanAttach({
  title: "치킨 약속",
  windowStartIso: futureIso,
  place: "둔산동",
  peerDisplayName: "민수",
  intentKind: "appointment",
  events: [planEvent],
});
assert.equal(weakAttach.canContinue, false, "mention should not attach without strong signals");

const strongAttach = resolvePlanAttach({
  title: "제주 여행",
  windowStartIso: futureIso,
  place: "제주",
  peerDisplayName: "민수",
  intentKind: "plan",
  events: [planEvent],
});
assert.equal(strongAttach.canContinue, true);
assert.ok((strongAttach.attachScore ?? 0) >= 7);

const scheduleCandidate: DeepLinkBubbleCandidate = {
  id: "lens-schedule-trust",
  actionType: "schedule",
  label: "📅 약속",
  score: 1,
  confidence: 0.9,
  reason: "7시 약속",
  deepLink: "rimvio://calendar",
  payload: {
    title: "치킨 약속",
    datetime: "2027-06-05T19:00:00+09:00",
    place: "둔산동",
  },
};

const draft = prepareScheduleConfirmDraft({
  candidate: scheduleCandidate,
  sourceMessageId: "msg-trust",
  peerDisplayName: "황정성",
});

assert.equal(
  resolveScheduleTrustZone({ draft, trustStage: 1 }),
  "confirm_sheet",
  "beginner stage always confirms",
);

assert.equal(
  resolveScheduleTrustZone({ draft, trustStage: 3 }),
  "fast_commit",
  "heavy stage skips sheet for simple appointment",
);

const planDraft = prepareScheduleConfirmDraft({
  candidate: {
    ...scheduleCandidate,
    payload: {
      title: "제주 3박4일",
      datetime: futureIso,
      place: "제주",
    },
  },
  peerDisplayName: "민수",
});
planDraft.intent = { ...planDraft.intent, kind: "plan" };
assert.equal(
  resolveScheduleTrustZone({ draft: planDraft, trustStage: 3 }),
  "confirm_sheet",
  "plans never fast-commit",
);

resetEventCandidatesForTests([]);
const committed = fastCommitScheduleDraft(draft);
assert.equal(committed.ok, true);
assert.ok(committed.eventId);
assert.equal(listEventCandidates().length, 1);

assert.equal(undoLensScheduleCommit(committed.eventId!), true);
const undone = findEventCandidate(committed.eventId!);
assert.equal(undone?.lifecycle, "archived");
assert.equal(
  listEventCandidates().filter((row) => row.lifecycle !== "archived").length,
  0,
);

resetEventCandidatesForTests([]);

console.log("test-schedule-trust-zone: ok");

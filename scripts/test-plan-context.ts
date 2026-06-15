#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildPlanContextDraft } from "../lib/plan-context/build-plan-context-draft";
import {
  computeWindowEndFromNights,
  extractPlanWindowFromText,
} from "../lib/plan-context/extract-plan-window";
import { formatPlanWindowLabel } from "../lib/plan-context/format-plan-window-label";
import { parseScheduleEditFields } from "../lib/peer-chat/ai-lens/resolve-schedule-datetime";
import { readPlanContextFromEvent } from "../lib/plan-context/plan-context-metadata";
import { resolvePlanAttach } from "../lib/plan-context/resolve-plan-attach";
import { stampPlanContextMetadata } from "../lib/plan-context/plan-context-metadata";
import type { EventCandidate } from "../lib/events/event-candidate";

const startIso = "2026-06-12T03:00:00.000Z";

const fromNights = extractPlanWindowFromText("제주 3박4일 여행 가자", startIso);
assert.equal(fromNights.nights, 3);
assert.equal(fromNights.windowConfidence, "estimated");
assert.ok(fromNights.windowEndIso);

const fromReturn = extractPlanWindowFromText("6/15에 돌아와", startIso);
assert.equal(fromReturn.windowConfidence, "confirmed");
assert.ok(fromReturn.windowEndIso);

const end = computeWindowEndFromNights(startIso, 2);
assert.ok(end);
assert.equal(parseScheduleEditFields(end).date, "2026-06-14");

const label = formatPlanWindowLabel({
  windowStartIso: startIso,
  windowEndIso: end,
  nights: 2,
  windowConfidence: "estimated",
});
assert.ok(label?.includes("–"));

const existing: EventCandidate = {
  id: "ec-jeju",
  title: "제주 여행",
  category: "schedule",
  source: "message",
  lifecycle: "active",
  datetime: startIso,
  place: "제주",
  confidence: 0.9,
  metadata: {
    feedPlanEnabled: true,
    planKind: "plan",
    planWindowEndIso: end,
    planPeerDisplayName: "수연",
  },
  lifecycleUpdatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const attach = resolvePlanAttach({
  title: "제주 렌트카 예약",
  windowStartIso: "2026-06-13T03:00:00.000Z",
  place: "제주",
  peerDisplayName: "수연",
  intentKind: "plan",
  events: [existing],
});
assert.equal(attach.mode, "continue");
assert.equal(attach.candidatePlanId, "ec-jeju");
assert.equal(attach.canContinue, true);

const draft = buildPlanContextDraft({
  title: "제주 여행 준비",
  windowStartIso: startIso,
  place: "제주",
  peerDisplayName: "수연",
  conversationText: "6/12 제주 가서 3박4일 6/15에 돌아와",
  events: [existing],
});
assert.equal(draft.context.nights, 3);
assert.ok(draft.context.windowEndIso);

const stamped = stampPlanContextMetadata({}, draft.context);
assert.equal(stamped.planWindowEndIso, draft.context.windowEndIso);

const roundTrip = readPlanContextFromEvent({
  ...existing,
  metadata: { ...existing.metadata, ...stamped },
});
assert.equal(roundTrip?.windowEndIso, draft.context.windowEndIso);

const gyesanPlan: EventCandidate = {
  id: "ec-gyesan",
  title: "계산동722 약속",
  category: "schedule",
  source: "message",
  lifecycle: "active",
  datetime: startIso,
  place: "계산동722",
  confidence: 0.9,
  metadata: {
    feedPlanEnabled: true,
    planKind: "plan",
    planPeerDisplayName: "공용계정",
  },
  lifecycleUpdatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const separateAppointment = resolvePlanAttach({
  title: "둔산동 스타벅스 약속",
  windowStartIso: "2026-06-07T05:00:00.000Z",
  place: "둔산동 스타벅스",
  peerDisplayName: "공용계정",
  intentKind: "appointment",
  events: [gyesanPlan],
});
assert.equal(separateAppointment.mode, "new");
assert.equal(separateAppointment.canContinue, false);

console.log("test-plan-context: ok");

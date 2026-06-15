#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { normalizeAnchorId } from "../lib/events/normalize-anchor-id";
import {
  resetEventCandidatesForTests,
} from "../lib/events/event-store";
import { attachEventAnchorIds } from "../lib/predictive-dock/attach-event-anchor-ids";
import { wireEventCompleted } from "../lib/events/event-lifecycle-hooks";
import {
  advanceEventLifecycleById,
  listEventCandidatesByLifecycle,
} from "../lib/events/event-store";

const EC = "ec-unify-test";
const MSG_ID = "msg-anchor-001";
const now = new Date().toISOString();

const fixture: EventCandidate = {
  id: EC,
  title: "치과",
  category: "schedule",
  source: "message",
  lifecycle: "active",
  datetime: "2026-05-31T17:00:00",
  confidence: 0.9,
  metadata: { sourceMessageId: MSG_ID, sourceMessage: "내일 치과" },
  lifecycleUpdatedAt: now,
  createdAt: now,
  updatedAt: now,
};

resetEventCandidatesForTests([fixture]);

assert.equal(normalizeAnchorId(fixture), EC);
assert.equal(normalizeAnchorId(EC), EC);
assert.equal(normalizeAnchorId(`${EC}:nav-active`), EC);
assert.equal(normalizeAnchorId(`${EC}:call`), EC);

assert.equal(normalizeAnchorId(`msg:${MSG_ID}`), EC);
assert.equal(normalizeAnchorId(`${MSG_ID}:nav`), EC);
assert.equal(normalizeAnchorId({ messageId: MSG_ID }), EC);

assert.equal(normalizeAnchorId("trip-dock-test:taxi"), null);
assert.equal(normalizeAnchorId("dining:테라스:map"), null);
assert.equal(normalizeAnchorId("conv:nav"), null);
assert.equal(normalizeAnchorId("architect-main-dynamic"), null);
assert.equal(normalizeAnchorId("msg:unknown-id"), null);

const templateWire = attachEventAnchorIds(
  {
    main_action: {
      id: "architect-main-AIRPORT_TRAVEL_01",
      type: "TAXI",
      label: "택시",
      icon: "🚕",
      score: 99,
      state: "ACTIVE",
      prompt: "택시",
    },
    shadow_actions: [
      {
        id: "architect-shadow-0",
        type: "INFO",
        label: "항공권",
        icon: "ℹ️",
        score: 85,
        state: "WARM",
        prompt: "항공권",
      },
    ],
  },
  EC
);
assert.equal(templateWire.main_action?.anchorId, EC);
assert.equal(templateWire.shadow_actions[0]?.anchorId, undefined);

const completed = wireEventCompleted({
  anchorId: `${EC}:nav-active`,
  actionType: "NAVIGATE",
});
assert.ok(completed);
assert.equal(completed!.lifecycle, "completed");

resetEventCandidatesForTests([{ ...fixture, lifecycle: "active" }]);
advanceEventLifecycleById(EC, "active");
const completedViaActionId = wireEventCompleted({
  actionId: `${EC}:call`,
  actionType: "CALL",
});
assert.equal(completedViaActionId?.lifecycle, "completed");
assert.equal(listEventCandidatesByLifecycle("completed").length, 1);

resetEventCandidatesForTests([]);
console.log("test-normalize-anchor-id: ok");

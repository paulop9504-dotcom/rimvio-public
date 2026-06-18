#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { derivePresentationWire } from "../lib/presentation/presentation-mode";

assert.deepEqual(
  derivePresentationWire({
    experienceChoice: { action: "ASK_CHOICE" },
  }),
  { mode: "EXPERIENCE_CHOICE" }
);

assert.deepEqual(
  derivePresentationWire({
    policy: { policy_action: "DEFLECT" },
  }),
  { mode: "POLICY_REDIRECT" }
);

assert.deepEqual(
  derivePresentationWire({
    cafeDiscovery: { action: "SHOW_CAFE_CARDS", summary: "x", options: [] },
  }),
  { mode: "VISUAL", visual_kind: "place" }
);

assert.deepEqual(
  derivePresentationWire({
    morningBriefing: { greeting: "good morning" },
  }),
  { mode: "DASHBOARD" }
);

assert.deepEqual(
  derivePresentationWire({
    schedule: { is_conflict: false, message: "", tasks: [{ time: "15:00", task: "미팅" }] },
  }),
  { mode: "TIMELINE" }
);

assert.deepEqual(
  derivePresentationWire({
    scheduledDelivery: { status: "pending" },
  }),
  { mode: "TIMELINE" }
);

assert.deepEqual(
  derivePresentationWire({
    transportLive: { data: {} },
    actions: [{ id: "a1", kind: "open", label: "길찾기", href: "#" }],
  }),
  { mode: "ACTION" }
);

assert.deepEqual(
  derivePresentationWire({
    actions: [{ id: "a1", kind: "open", label: "차트 보기", href: "#" }],
  }),
  { mode: "ACTION" }
);

console.log("test-presentation-mode: ok");

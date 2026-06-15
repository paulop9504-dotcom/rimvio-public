#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "@/lib/events/event-store";
import { applyEventCandidateUpsertFromApi } from "@/lib/events/emit-event-candidate";
import {
  hasActiveDecisionStream,
} from "@/lib/surface-composition/surface-collapse-controller";
import {
  isExpressLaneTurn,
  shouldRouteToPeerTalkIngress,
} from "@/lib/inside-out/canonical-loop";
import { ingestMarbleWire } from "@/lib/inside-out/marble-ingest";

resetEventCandidatesForTests([]);

assert.equal(isExpressLaneTurn("@알림 3분"), true);
assert.equal(isExpressLaneTurn("@타이머 5분"), false);
assert.equal(isExpressLaneTurn("@길찾기 강남"), false);
assert.equal(
  shouldRouteToPeerTalkIngress({
    peerTalkActive: true,
    text: "다음 달 부산 여행",
    hasAttachments: false,
  }),
  true,
);
assert.equal(
  shouldRouteToPeerTalkIngress({
    peerTalkActive: true,
    text: "@알림 3분",
    hasAttachments: false,
  }),
  false,
);

const wire = {
  id: "ec-test-orch-1",
  title: "부산 여행",
  category: "travel" as const,
  source: "message" as const,
  lifecycle: "mentioned" as const,
  confidence: 0.8,
};

const fromOrch = applyEventCandidateUpsertFromApi(wire, { sourceMessageId: "msg-orch-1" });
assert.ok(fromOrch);
assert.equal(fromOrch?.metadata?.channel, "orchestrator");

const fromIngest = ingestMarbleWire(
  { ...wire, id: "ec-test-ingest-1" },
  { channel: "peer_talk", sourceLine: "부산 가자", peerDisplayName: "민수" },
);
assert.ok(fromIngest);
assert.equal(fromIngest?.metadata?.channel, "peer_talk");

assert.equal(
  hasActiveDecisionStream({
    primary: { id: "surface:rimvio:start-here", visibility: "prominent" },
  }),
  false,
);
assert.equal(
  hasActiveDecisionStream({
    primary: { id: "surface:ec:ec-test-ingest-1", visibility: "prominent" },
  }),
  true,
);

console.log("test-canonical-loop: ok");

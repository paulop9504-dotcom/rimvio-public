#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  resetContainerEventsForTests,
  appendContainerEvent,
} from "../lib/container-store/events-store";
import {
  resetContainerStoreForTests,
  createContainer,
  touchContainer,
} from "../lib/container-store/containers-store";
import {
  deriveArchitectConfidence,
  shouldQueueInbox,
} from "../lib/data-architect/confidence";
import { deriveTodayAxisCards } from "../lib/home/derive-today-axis";
import {
  appendInboxItem,
  countPendingInboxItems,
  resetHomeInboxForTests,
} from "../lib/home/inbox-store";

resetContainerStoreForTests();
resetContainerEventsForTests();
resetHomeInboxForTests();

const project = createContainer({
  id: "ctx-hifive",
  title: "HI-FIVE SaaS",
  goal: "SaaS launch",
  kind: "context",
});
touchContainer(project.id);

appendContainerEvent({
  container_id: project.id,
  type: "stream_append",
  data: { message: "test" },
});
appendContainerEvent({
  container_id: project.id,
  type: "orchestrator_result",
  data: { summary: "결정: 베타 오픈" },
});

const cards = deriveTodayAxisCards();
assert.ok(cards.some((card) => card.containerId === project.id));
assert.ok(cards.find((card) => card.containerId === project.id)!.eventCount >= 2);

const uncategorizedWire = {
  action: "UNCATEGORIZED" as const,
  container_id: "uncategorized",
  container_title: "Uncategorized(임시)",
  classification: { knowledge: ["https://x.com"], stream: [] },
  reasoning: "test",
};
assert.ok(shouldQueueInbox(uncategorizedWire));
assert.ok(deriveArchitectConfidence(uncategorizedWire, "hi") < 0.4);

appendInboxItem({
  preview: "분류 안 된 링크",
  confidence: 0.25,
  action: "UNCATEGORIZED",
});
assert.equal(countPendingInboxItems(), 1);

console.log("test-home-axis: ok");

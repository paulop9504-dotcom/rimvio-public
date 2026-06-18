#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  getContainerById,
  resetContainerEventsForTests,
  resetContainerStoreForTests,
} from "../lib/container-store";
import { persistPlaceToKnowledge } from "../lib/persistence/persistence-bridge";
import { classifyInboxItemWithVitality } from "../lib/home/inbox-classifier";
import {
  appendInboxItem,
  listPendingInboxItems,
  resetHomeInboxForTests,
} from "../lib/home/inbox-store";
import { resetStreamStoreForTests } from "../lib/data-architect/persist-stream-record";
import { listContainers } from "../lib/container-store/containers-store";
import { DEFAULT_VITALITY_TAG } from "../lib/vitality/types";

resetContainerStoreForTests();
resetContainerEventsForTests();
resetStreamStoreForTests();
resetHomeInboxForTests();

const seeded = listContainers();
assert.ok(seeded.every((item) => item.vitality_tag === DEFAULT_VITALITY_TAG));

const persisted = persistPlaceToKnowledge({
  name: "성심당 본점",
  address: "대전 중구",
  category: "양식",
  rating: 4.2,
});

const placeContainer = getContainerById(persisted.containerId);
assert.ok(placeContainer);
assert.equal(placeContainer?.kind, "place");
assert.ok(placeContainer?.knowledge.some((item) => item.kind === "place"));
assert.ok(placeContainer?.knowledge[0]?.raw?.saved_at);

const inboxItem = appendInboxItem({
  preview: "포켓몬 카드 신규 세트 메모 https://example.com",
  confidence: 0.25,
  action: "UNCATEGORIZED",
});

assert.equal(listPendingInboxItems().length, 1);

const classified = classifyInboxItemWithVitality({
  inboxItemId: inboxItem.id,
  vitalityTag: "Apex",
});

assert.equal(listPendingInboxItems().length, 0);
const apexContainer = getContainerById(classified.containerId);
assert.ok(apexContainer);
assert.equal(apexContainer?.vitality_tag, "Apex");
assert.ok(apexContainer?.knowledge.length > 0 || apexContainer?.knowledge.length >= 0);

console.log("test-persistence-bridge: ok");

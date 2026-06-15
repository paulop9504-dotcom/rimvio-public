#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { classifyPinDomainFromText } from "../lib/globe/classify-pin-domain";
import { extractGatheringPinSlots } from "../lib/globe/extract-gathering-pin-slots";
import {
  PIN_LINEAGE_PARENT_EVENT_ID_META_KEY,
  readPinLineageParentEventId,
  stampPinLineageParent,
} from "../lib/globe/pin-lineage-metadata";
import { getPinDomain } from "../lib/globe/pin-domain-registry";
import { runGlobeComposerAction } from "../lib/globe/run-globe-composer-action";
import {
  readPinDomainId,
  readPinScopeFromMetadata,
  stampUniversalPinMetadata,
} from "../lib/globe/stamp-universal-pin-metadata";

assert.equal(getPinDomain("gathering").phase, "active");

const classified = classifyPinDomainFromText("토요일 강남 번개 4명");
assert.equal(classified.domainId, "gathering");
assert.equal(classified.inferredDomainId, null);
assert.equal(classified.slots.headcountHint, 4);
assert.equal(classified.slots.timeHint, "토요일");

const slots = extractGatheringPinSlots("내일 모임 6명");
assert.equal(slots.headcountHint, 6);
assert.equal(slots.timeHint, "내일");

const stamped = stampUniversalPinMetadata({
  sourceText: "번개 모임 같이 가요",
});
assert.equal(readPinDomainId(stamped), "gathering");
assert.equal(readPinScopeFromMetadata(stamped), "external");

const withLineage = stampUniversalPinMetadata({
  sourceText: "모임 후기",
  lineageParentEventId: "evt-parent-1",
});
assert.equal(readPinLineageParentEventId(withLineage), "evt-parent-1");

const lineageOnly = stampPinLineageParent({}, "evt-2");
assert.equal(lineageOnly[PIN_LINEAGE_PARENT_EVENT_ID_META_KEY], "evt-2");

const gatheringAction = runGlobeComposerAction("@모임 토요일 강남 4명");
assert.ok(gatheringAction);
assert.equal(gatheringAction!.kind, "gathering-compose");
if (gatheringAction!.kind === "gathering-compose") {
  assert.match(gatheringAction.composeText, /모임/u);
  assert.match(gatheringAction.composeText, /토요일/u);
}

const emptyGathering = runGlobeComposerAction("@모임");
assert.equal(emptyGathering?.kind, "gathering-compose");

console.log("test-gathering-pin-domain: ok");

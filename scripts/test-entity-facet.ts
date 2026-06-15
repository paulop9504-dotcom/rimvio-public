#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { tryKnowledgeRecall } from "../lib/action-chat/action-oriented-handler";
import { orchestrateUserMessage } from "../lib/action-chat/orchestrate-user-message";
import { parseEntityFacetIntent } from "../lib/context-resolver/discovery/parse-entity-facet-intent";
import { orchestrateEntityFacet } from "../lib/context-resolver/discovery/orchestrate-entity-facet";

assert.deepEqual(parseEntityFacetIntent("쿠우쿠우 가격"), {
  entity: "쿠우쿠우",
  facet: "price",
});
assert.equal(parseEntityFacetIntent("쿠우쿠우 맛집 추천"), null);

const prefs = [
  {
    id: "1",
    label: "쿠우쿠우",
    value: "쿠우쿠우",
    intent_key: "쿠우쿠우",
    address: null,
    source: "knowledge" as const,
  },
];

Promise.all([
  tryKnowledgeRecall("쿠우쿠우 가격", { placePreferences: prefs }),
  orchestrateEntityFacet("쿠우쿠우 가격"),
  orchestrateUserMessage({
    message: "쿠우쿠우 영업시간",
    history: [],
    masterContext: { placePreferences: prefs },
  }),
])
  .then(([recall, price, viaPipeline]) => {
    assert.equal(recall, null, "facet must not hit 단골 장소 recall");
    assert.ok(price?.summary.includes("요금"));
    assert.ok(price?.actions?.length);
    assert.ok(!viaPipeline.summary.includes("단골 장소"));
    assert.ok(viaPipeline.summary.includes("영업"));
    console.log("test-entity-facet: ok");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildDomainActions } from "../lib/actions/build-domain-actions";
import { resolveDomainKey } from "../lib/actions/domain-context";
import { enrichLinkWithDomainActions } from "../lib/actions/enrich-link-domain-actions";
import { UNIVERSAL_PILLAR_LABEL } from "../lib/actions/universal-action-pillar";
import type { LinkRow } from "../types/database";

assert.equal(resolveDomainKey({ message: "떡반집 맛집" }), "dining");
assert.equal(resolveDomainKey({ message: "제주 여행 일정" }), "travel");
assert.equal(resolveDomainKey({ message: "맥북 최저가" }), "shopping");

const dining = buildDomainActions({ domain: "dining", query: "떡반집" });
assert.equal(dining.length, 4);
assert.equal(dining[0]?.label, UNIVERSAL_PILLAR_LABEL.go);
assert.match(dining[0]?.href ?? "", /tmap:\/\//i);
assert.equal(dining[0]?.payload?.universalPrimary, true);
assert.ok(dining.every((action) => Object.values(UNIVERSAL_PILLAR_LABEL).includes(action.label)));

const travel = buildDomainActions({ domain: "travel", query: "제주" });
assert.equal(travel.length, 4);
assert.equal(travel[0]?.label, UNIVERSAL_PILLAR_LABEL.go);
assert.ok(travel.some((action) => action.label === UNIVERSAL_PILLAR_LABEL.save));

const shopping = buildDomainActions({ domain: "shopping", query: "맥북" });
assert.equal(shopping[0]?.label, UNIVERSAL_PILLAR_LABEL.deep_dive);

const link: LinkRow = {
  id: "test-food",
  title: "스타벅스 강남점",
  original_url: "https://rimvio.app/capture/test",
  domain: "rimvio.app",
  category: "food",
  source_type: "screenshot",
  actions: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_id: null,
  room_id: null,
  thumbnail_url: null,
  metadata: {},
  status: "active",
  phase: null,
};

const enriched = enrichLinkWithDomainActions(link, link.actions);
assert.equal(enriched.length, 4);
assert.equal(enriched[0]?.label, UNIVERSAL_PILLAR_LABEL.go);

console.log("test-domain-actions: ok");

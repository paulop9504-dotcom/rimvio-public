#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildCafeDiscoveryCriteria,
  parseFindCafeIntent,
} from "../lib/context-resolver/discovery/parse-find-cafe-intent";
import { compilePlaceDiscovery } from "../lib/context-resolver/discovery/compile-place-discovery";
import { placeProvider } from "../lib/context-resolver/providers/place-provider";
import { resetKnowledgeEntityMemoryForTests } from "../lib/knowledge/knowledge-entity-db";
import { resetPlaceContainerStoreForTests } from "../lib/data-ingestion/persist-place-container";
import { resetShadowStoreForTests } from "../lib/notification-shadow/shadow-store";

resetKnowledgeEntityMemoryForTests();
resetPlaceContainerStoreForTests();
resetShadowStoreForTests();

async function main() {
  const event = parseFindCafeIntent("지금 갈 만한 조용한 카페 추천해줘");
  assert.ok(event);
  assert.equal(event!.vibe, "quiet");
  assert.equal(event!.intent, "FIND_CAFE");

  const criteria = buildCafeDiscoveryCriteria(event!);
  assert.equal(criteria.only_open_now, true);
  assert.equal(criteria.min_rating, 4.0);
  assert.equal(criteria.max_results, 3);

  const context = await placeProvider.getContext(
    { lat: 36.3504, lng: 127.3845 },
    criteria
  );

  assert.ok(context.candidates.length >= 2);
  assert.ok(context.candidates.every((place) => place.open_now));
  assert.ok(context.candidates.every((place) => place.rating >= 4.0));
  assert.ok(context.candidates[0]!.travel_minutes >= 3);
  assert.match(context.candidates[0]!.reason, /도착/);

  const { wire, actions } = compilePlaceDiscovery(context);
  assert.equal(wire.action, "SHOW_CAFE_CARDS");
  assert.equal(wire.options.length, context.candidates.length);
  assert.ok(wire.options[0]!.action_buttons.some((btn) => /티맵|길찾/i.test(btn.label)));
  assert.ok(actions.length >= 3);
  assert.match(wire.summary, /조용한/);

  console.log("test-place-discovery: ok");
}

void main();

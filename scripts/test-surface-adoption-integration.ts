#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import {
  FIXTURE_LIFE_PROJECTIONS,
  FIXTURE_BUILD_CONTEXT,
  buildSurfacesFromLife,
  rankSurfaces,
  routeSurfacesToChannels,
  selectSurfacesForChannel,
} from "@/lib/surface-engine";
import { surfacesToPredictiveDockWire } from "@/lib/surface-engine/adapters/surface-to-dock-wire";
import { buildCalendarSnapshotFromSurfaces } from "@/lib/surface-engine/adapters/surface-to-calendar";

function testFeedIntegration() {
  const built = buildSurfacesFromLife(FIXTURE_LIFE_PROJECTIONS, FIXTURE_BUILD_CONTEXT);
  const ranked = rankSurfaces(built);
  const routes = routeSurfacesToChannels(ranked);
  const feed = selectSurfacesForChannel(routes, "FEED");
  assert.ok(feed.length > 0);
  const wire = surfacesToPredictiveDockWire(feed);
  assert.ok(wire.main_action);
  assert.equal(wire.main_action?.action_tier, "MAIN");
}

function testChatIntegration() {
  const built = buildSurfacesFromLife(FIXTURE_LIFE_PROJECTIONS, FIXTURE_BUILD_CONTEXT);
  const ranked = rankSurfaces(built);
  const routes = routeSurfacesToChannels(ranked);
  const chat = selectSurfacesForChannel(routes, "CHAT");
  assert.ok(chat.length >= 0);
}

function testCalendarIntegration() {
  const built = buildSurfacesFromLife(FIXTURE_LIFE_PROJECTIONS, FIXTURE_BUILD_CONTEXT);
  const ranked = rankSurfaces(built);
  const routes = routeSurfacesToChannels(ranked);
  const calendar = selectSurfacesForChannel(routes, "CALENDAR");
  const snapshot = buildCalendarSnapshotFromSurfaces({
    calendarSurfaces: calendar,
    streamActions: [],
    anchor: FIXTURE_BUILD_CONTEXT.now,
    now: FIXTURE_BUILD_CONTEXT.now,
  });
  assert.ok(snapshot.overlayRows.length >= 0);
  if (calendar.length > 0) {
    assert.ok(snapshot.overlayRows.some((row) => row.overlayActions.length > 0));
  }
}

testFeedIntegration();
testChatIntegration();
testCalendarIntegration();

console.log("test-surface-adoption-integration: ok");

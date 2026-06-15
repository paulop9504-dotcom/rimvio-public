#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSurfacesFromLife,
  rankSurfaces,
  resolveSurfaces,
  routeSurfacesToChannels,
  selectPrimaryAction,
  SURFACE_CONTRACT_VERSION,
} from "@/lib/surface-engine";
import {
  FIXTURE_BUILD_CONTEXT,
  FIXTURE_LIFE_PROJECTIONS,
  FIXTURE_OSAKA_TRAVEL,
  FIXTURE_TRAVEL_AFTER_FLIGHT,
  FIXTURE_TRAVEL_AFTER_HOTEL,
} from "@/lib/surface-engine/surface-test-fixtures";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENGINE_DIR = path.join(REPO, "lib/surface-engine");

const REQUIRED_CONTRACT_KEYS = [
  "id",
  "type",
  "title",
  "description",
  "primaryAction",
  "secondaryActions",
  "people",
  "resources",
  "events",
  "narration",
  "priority",
  "visibility",
  "lifecycle",
] as const;

function testContractStability() {
  const surfaces = buildSurfacesFromLife(FIXTURE_LIFE_PROJECTIONS, FIXTURE_BUILD_CONTEXT);
  assert.ok(surfaces.length >= 3, "expected multiple situation surfaces");
  const sample = surfaces[0]!;
  for (const key of REQUIRED_CONTRACT_KEYS) {
    assert.ok(key in sample, `missing contract key: ${key}`);
  }
  assert.equal(sample.primaryAction.kind, "primary");
  assert.ok(sample.secondaryActions.every((a) => a.kind === "secondary"));
  assert.equal(SURFACE_CONTRACT_VERSION, 1);
}

function testPrimaryActionTravelChain() {
  const sid = "surface:ec:ec-osaka-1";
  const step1 = selectPrimaryAction(
    FIXTURE_OSAKA_TRAVEL,
    sid,
    "travel",
    FIXTURE_BUILD_CONTEXT,
  );
  assert.equal(step1.label, "✈️ 항공권 예약");
  assert.equal(step1.capabilityId, "BOOK_FLIGHT");

  const step2 = selectPrimaryAction(
    FIXTURE_OSAKA_TRAVEL,
    sid,
    "travel",
    FIXTURE_TRAVEL_AFTER_FLIGHT,
  );
  assert.equal(step2.label, "🏨 숙소 예약");

  const step3 = selectPrimaryAction(
    FIXTURE_OSAKA_TRAVEL,
    sid,
    "travel",
    FIXTURE_TRAVEL_AFTER_HOTEL,
  );
  assert.equal(step3.label, "📱 체크인 준비");
}

function testDeterministicRanking() {
  const built = buildSurfacesFromLife(FIXTURE_LIFE_PROJECTIONS, FIXTURE_BUILD_CONTEXT);
  const a = rankSurfaces(built).map((s) => s.id);
  const b = rankSurfaces(built).map((s) => s.id);
  assert.deepEqual(a, b);
}

function testBuilderCorrectness() {
  const surfaces = buildSurfacesFromLife(FIXTURE_LIFE_PROJECTIONS, FIXTURE_BUILD_CONTEXT);
  const osaka = surfaces.find((s) => s.id === "surface:ec:ec-osaka-1");
  assert.ok(osaka);
  assert.equal(osaka.type, "travel");
  assert.equal(osaka.events[0]?.eventId, "ec-osaka-1");

  const chicken = surfaces.find((s) => s.id === "surface:ec:ec-chicken-1");
  assert.ok(chicken);
  assert.equal(chicken.primaryAction.capabilityId, "CONFIRM_PLACE");
}

function testRouterCaps() {
  const built = buildSurfacesFromLife(FIXTURE_LIFE_PROJECTIONS, FIXTURE_BUILD_CONTEXT);
  const ranked = rankSurfaces(built);
  const routes = routeSurfacesToChannels(ranked);
  assert.ok(routes.FEED.length <= 5);
  assert.ok(routes.CHAT.length <= 3);
  assert.ok(routes.CALENDAR.length <= 5);
}

function scanSurfaceEngineImports(): string[] {
  const violations: string[] = [];
  const forbidden = [
    /@\/lib\/events\/event-store/,
    /@\/lib\/source-of-truth\/commit-truth/,
    /@\/lib\/action-dispatcher/,
    /@\/lib\/plugin-registry/,
    /kakao/i,
  ];

  for (const entry of fs.readdirSync(ENGINE_DIR)) {
    if (!entry.endsWith(".ts")) {
      continue;
    }
    const source = fs.readFileSync(path.join(ENGINE_DIR, entry), "utf8");
    for (const pattern of forbidden) {
      if (pattern.test(source)) {
        violations.push(`${entry}:${pattern}`);
      }
    }
  }
  return violations;
}

function testBoundaryImports() {
  const violations = scanSurfaceEngineImports();
  assert.equal(violations.length, 0, violations.join("\n"));
}

testContractStability();
testPrimaryActionTravelChain();
testDeterministicRanking();
testBuilderCorrectness();
testRouterCaps();
testBoundaryImports();

console.log("test-surface-engine: ok");

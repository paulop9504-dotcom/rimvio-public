#!/usr/bin/env npx tsx
/**
 * Personalization guardrails + recency weight validation.
 * Usage: npm run test:personalization
 */

import assert from "node:assert/strict";
import {
  applyRecencyWeights,
  recencyWeight,
  RECENCY_LAMBDA,
  PERSONAL_MAX,
  STATE_MAX,
  MIN_CLICKS_FOR_PERSONAL,
  PRIMARY_SWAP_MARGIN,
  PRIMARY_HYSTERESIS_MARGIN,
} from "../lib/personalization/constants";
import {
  applyScoreGuardrails,
  computePersonalMotivation,
  computeStateTransitionBoost,
  pickPersonalizedPrimaryAction,
} from "../lib/personalization/score-guardrails";
import { resolvePrimaryWithHysteresis } from "../lib/personalization/primary-lock";
import { toActionFamily } from "../lib/personalization/action-family";
import type { LinkActionItem } from "../types/database";
import { normalizeEnricherContext } from "../lib/enrichers/context";
import { toContextBin } from "../lib/intent/context-bin";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(error);
  }
}

test("recency weight follows exp(-0.35 * i)", () => {
  assert.ok(Math.abs(recencyWeight(0) - 1) < 0.001);
  assert.ok(Math.abs(recencyWeight(1) - Math.exp(-RECENCY_LAMBDA)) < 0.001);
  assert.ok(recencyWeight(9) < 0.05);
});

test("applyRecencyWeights assigns descending weights", () => {
  type ClickEntry = {
    weight?: number;
    action_family: "price_compare" | "summary_read";
    domain_family: "commerce" | "news";
    context_bin: string;
    ts: string;
  };

  const weighted = applyRecencyWeights<ClickEntry>([
    { action_family: "price_compare", domain_family: "commerce", context_bin: "day|default", ts: "1" },
    { action_family: "summary_read", domain_family: "news", context_bin: "day|default", ts: "2" },
  ]);

  assert.ok(weighted[0].weight > weighted[1].weight);
});

test("personal boost blocked below MIN_CLICKS_FOR_PERSONAL", () => {
  const boost = computePersonalMotivation(
    "price_compare",
    {
      recent_clicks: [],
      family_counts: {},
      domain_affinity: {},
      click_total: MIN_CLICKS_FOR_PERSONAL - 1,
    },
    "commerce",
    "day|default"
  );

  assert.equal(boost, 0);
});

test("guardrail caps personal share of rule score", () => {
  const result = applyScoreGuardrails({
    ruleScore: 40,
    personalRaw: 50,
    stateRaw: 20,
  });

  assert.ok(result.personal <= 40 * 0.25 + 0.01);
  assert.ok(result.personal <= PERSONAL_MAX);
  assert.ok(result.state <= STATE_MAX);
  assert.ok(result.applied.includes("personal_share_cap"));
});

test("guardrail caps combined personal + state", () => {
  const result = applyScoreGuardrails({
    ruleScore: 50,
    personalRaw: 20,
    stateRaw: 30,
  });

  assert.ok(result.personal + result.state <= 50 * 0.35 + 0.01);
  assert.ok(result.applied.includes("combined_share_cap"));
});

test("state transition boosts compare on revisit for commerce", () => {
  const boost = computeStateTransitionBoost(
    "price_compare",
    {
      link_id: "l1",
      domain_family: "secondhand",
      link_category: "shopping",
      lifecycle_state: "saved",
      first_saved_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      last_opened_at: new Date().toISOString(),
      last_action_family: null,
      last_action_at: null,
      reopen_count: 1,
    },
    "secondhand"
  );

  assert.equal(boost, STATE_MAX);
});

test("pickPersonalizedPrimaryAction respects PRIMARY_SWAP_MARGIN", () => {
  const actions: LinkActionItem[] = [
    {
      id: "rule-winner",
      kind: "open",
      label: "🛒 중고나라에서 보기",
      href: "https://web.joongna.com/p/1",
      payload: { icon: "link", contextBoost: "installed-app" },
    },
    {
      id: "challenger",
      kind: "open",
      label: "🔔 최저가 추적",
      href: "https://search.danawa.com/",
      payload: { icon: "bell" },
    },
  ];

  const context = normalizeEnricherContext({ hour: 12 });
  const profile = {
    recent_clicks: Array.from({ length: 5 }).map((_, i) => ({
      action_family: "price_compare" as const,
      domain_family: "secondhand" as const,
      context_bin: toContextBin(context),
      weight: recencyWeight(i),
      ts: new Date().toISOString(),
    })),
    family_counts: { price_compare: 5 },
    domain_affinity: { secondhand: 1 },
    click_total: 5,
  };

  const primary = pickPersonalizedPrimaryAction({
    actions,
    context,
    sourceUrl: "https://web.joongna.com/p/1",
    profile,
    linkState: {
      link_id: "l1",
      domain_family: "secondhand",
      link_category: "shopping",
      lifecycle_state: "opened",
      first_saved_at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
      last_opened_at: new Date().toISOString(),
      last_action_family: "save_open",
      last_action_at: null,
      reopen_count: 2,
    },
    domainFamily: "secondhand",
    contextBin: toContextBin(context),
  });

  assert.ok(primary);
  assert.equal(toActionFamily(primary!), "price_compare");
});

test("primary hysteresis keeps user-tapped incumbent without enough margin", () => {
  const actions: LinkActionItem[] = [
    {
      id: "user-picked",
      kind: "open",
      label: "🛒 중고나라에서 보기",
      href: "https://web.joongna.com/p/1",
      payload: { icon: "link" },
    },
    {
      id: "challenger",
      kind: "open",
      label: "🔔 최저가 추적",
      href: "https://search.danawa.com/",
      payload: { icon: "bell" },
    },
  ];

  const context = normalizeEnricherContext({ hour: 12 });
  const profile = {
    recent_clicks: Array.from({ length: 4 }).map((_, i) => ({
      action_family: "price_compare" as const,
      domain_family: "secondhand" as const,
      context_bin: toContextBin(context),
      weight: recencyWeight(i),
      ts: new Date().toISOString(),
    })),
    family_counts: { price_compare: 4 },
    domain_affinity: { secondhand: 0.8 },
    click_total: 4,
  };

  const primary = pickPersonalizedPrimaryAction({
    actions,
    context,
    sourceUrl: "https://web.joongna.com/p/1",
    profile,
    domainFamily: "secondhand",
    contextBin: toContextBin(context),
    incumbentActionId: "user-picked",
  });

  assert.ok(primary);
  assert.equal(primary!.id, "user-picked");
});

test("resolvePrimaryWithHysteresis swaps when margin exceeds threshold", () => {
  const actions: LinkActionItem[] = [
    {
      id: "incumbent",
      kind: "open",
      label: "A",
      href: "https://example.com/a",
    },
    {
      id: "winner",
      kind: "open",
      label: "B",
      href: "https://example.com/b",
    },
  ];

  const kept = resolvePrimaryWithHysteresis({
    scored: [
      { action: actions[1]!, total: 100 },
      { action: actions[0]!, total: 95 },
    ],
    incumbentActionId: "incumbent",
    fallback: actions[1]!,
  });

  assert.ok(kept);
  assert.equal(kept.id, "incumbent");
  assert.ok(100 - 95 < PRIMARY_HYSTERESIS_MARGIN);

  const swapped = resolvePrimaryWithHysteresis({
    scored: [
      { action: actions[1]!, total: 120 },
      { action: actions[0]!, total: 95 },
    ],
    incumbentActionId: "incumbent",
    fallback: actions[1]!,
  });

  assert.ok(swapped);
  assert.equal(swapped.id, "winner");
  assert.ok(120 - 95 >= PRIMARY_HYSTERESIS_MARGIN);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

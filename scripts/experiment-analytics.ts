#!/usr/bin/env npx tsx
/**
 * Tier 1 analytics summarize checks (no network).
 * Usage: npm run experiment:analytics
 */

import assert from "node:assert/strict";
import { analyticsEventToInsert } from "../lib/analytics/server-store";
import { summarizeAnalyticsEvents } from "../lib/analytics/summarize";
import type { BlinkAnalyticsEvent } from "../lib/analytics/types";

const sample: BlinkAnalyticsEvent[] = [
  {
    type: "funnel",
    step: "share",
    ts: 1,
    sessionId: "s1",
    flowId: "f1",
    domain: "map.naver.com",
    enricher_id: null,
  },
  {
    type: "funnel",
    step: "now_ready",
    ts: 2,
    sessionId: "s1",
    flowId: "f1",
    domain: "map.naver.com",
    enricher_id: "map-v1",
  },
  {
    type: "enrich",
    ts: 2,
    sessionId: "s1",
    flowId: "f1",
    domain: "map.naver.com",
    enricher_id: "map-v1",
    source_type: "map",
    titleFromDomain: false,
    imageFromFallback: true,
  },
  {
    type: "action_click",
    ts: 3,
    sessionId: "s1",
    flowId: "f1",
    surface: "now",
    domain: "map.naver.com",
    enricher_id: "map-v1",
    source_type: "map",
    actionLabel: "🚕 카카오T · 강릉",
    actionKind: "open",
    hadCopyText: true,
    copySucceeded: true,
  },
  {
    type: "funnel",
    step: "now_done",
    ts: 4,
    sessionId: "s1",
    flowId: "f1",
    domain: "map.naver.com",
    enricher_id: "map-v1",
  },
];

const summary = summarizeAnalyticsEvents(sample);

assert.equal(summary.eventCount, 5);
assert.equal(summary.funnel.share, 1);
assert.equal(summary.funnel.now_done, 1);
assert.equal(summary.enrichByEnricher["map-v1"], 1);
assert.equal(summary.actionClicksByLabel["🚕 카카오T · 강릉"], 1);
assert.equal(summary.copy.copySucceeded, 1);
assert.equal(summary.fallback.imageFromFallback, 1);
assert.equal(summary.funnelRates.shareToDone, 1);

const enrichRow = analyticsEventToInsert(sample[2] as BlinkAnalyticsEvent);
assert.equal(enrichRow.event_type, "enrich");
assert.equal(enrichRow.domain, "map.naver.com");
assert.equal(enrichRow.enricher_id, "map-v1");

const clickRow = analyticsEventToInsert(sample[3] as BlinkAnalyticsEvent);
const clickPayload = clickRow.payload as Record<string, unknown>;
assert.equal(clickRow.event_type, "action_click");
assert.equal(clickPayload.actionLabel, "🚕 카카오T · 강릉");
assert.equal(clickPayload.copySucceeded, true);

console.log("✓ analytics summarize");
console.log("✓ analytics supabase row mapping");
console.log("\n2/2 passed");

#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  appendActionTelemetry,
  resetActionTelemetryForTests,
} from "../lib/archive/action-telemetry-store";
import {
  findLearningRollupEntry,
  resetLearningRollupForTests,
} from "../lib/archive/learning-rollup-store";
import { foldFeedLinkLearning } from "../lib/archive/record-feed-link-telemetry";
import {
  ROLLUP_HYSTERESIS_MIN_SHOWN,
  resolveRollupUserHistoryWeight,
} from "../lib/action-decision/resolve-rollup-history-weight";
import {
  resolveLinkMainOffer,
  shouldShowLinkMainHero,
} from "../lib/action-chat/resolve-link-main-offer";
import { normalizeEnricherContext } from "../lib/enrichers/context";
import { toDomainFamily } from "../lib/personalization/action-family";
import { pickPersonalizedPrimaryAction } from "../lib/personalization/score-guardrails";
import type { LinkRow } from "../types/database";

function seedLink(partial: Partial<LinkRow> = {}): LinkRow {
  return {
    id: partial.id ?? "link-test",
    user_id: null,
    original_url: partial.original_url ?? "https://example.com/trip",
    title: partial.title ?? "제주 여행",
    thumbnail_url: null,
    domain: partial.domain ?? "naver.com",
    category: partial.category ?? "travel",
    actions: partial.actions ?? [
      { id: "open", label: "열기", kind: "open", href: "https://example.com/trip" },
      { id: "nav", label: "길찾기", kind: "open", href: "https://map.naver.com" },
    ],
    created_at: partial.created_at ?? new Date().toISOString(),
    expires_at: null,
  };
}

resetActionTelemetryForTests([]);
resetLearningRollupForTests([]);

const travelLink = seedLink();
const gatedOffer = resolveLinkMainOffer({
  link: travelLink,
  surface: "now",
});
assert.ok(gatedOffer.confidence >= 0.6);
assert.equal(
  shouldShowLinkMainHero({ offer: gatedOffer, actionsRevealed: false }),
  false,
  "medium confidence hides MAIN until reveal",
);

const urgent = resolveLinkMainOffer({
  link: seedLink({ title: "제주 D-0 출발" }),
  surface: "stack",
});
assert.equal(urgent.urgencyBypass, true);
assert.equal(
  shouldShowLinkMainHero({ offer: urgent, actionsRevealed: false }),
  true,
);

resetActionTelemetryForTests([]);
resetLearningRollupForTests([]);

appendActionTelemetry({
  eventId: "link:link-test",
  actionId: "nav",
  label: "길찾기",
  tier: "MAIN",
  kind: "shown",
  surface: "stack-a",
});
appendActionTelemetry({
  eventId: "link:link-test",
  actionId: "nav",
  label: "길찾기",
  tier: "MAIN",
  kind: "shown",
  surface: "stack-b",
});
appendActionTelemetry({
  eventId: "link:link-test",
  actionId: "nav",
  label: "길찾기",
  tier: "MAIN",
  kind: "shown",
  surface: "stack-c",
});
appendActionTelemetry({
  eventId: "link:link-test",
  actionId: "nav",
  label: "길찾기",
  tier: "MAIN",
  kind: "executed",
  surface: "stack",
});

foldFeedLinkLearning({
  linkId: "link-test",
  contextKey: "event.travel.link:naver.com",
});

const entry = findLearningRollupEntry("event.travel.link:naver.com", "nav");
assert.ok(entry);
assert.ok(entry!.shown >= ROLLUP_HYSTERESIS_MIN_SHOWN);

const feedPrimary = pickPersonalizedPrimaryAction({
  actions: travelLink.actions,
  context: normalizeEnricherContext({ hour: 12 }),
  sourceUrl: travelLink.original_url,
  domainFamily: toDomainFamily(travelLink.domain, travelLink.category),
  contextBin: "midday",
  link: travelLink,
});
assert.ok(feedPrimary, "feed primary resolves with link rollup ranking");
assert.ok(
  resolveRollupUserHistoryWeight({
    contextKey: "event.travel.link:naver.com",
    actionId: "nav",
    label: "길찾기",
  }) >= 0.5,
);

console.log("test-bca-slice: ok");

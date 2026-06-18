#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { ActionArchitectWire } from "../lib/action-registry/types";
import {
  resolveLinkMainOffer,
  shouldShowLinkMainHero,
} from "../lib/action-chat/resolve-link-main-offer";
import { validateArchitectWireAgainstPrm } from "../lib/personal-read-model/validate-architect-wire-against-prm";
import type { LinkRow } from "../types/database";

function seedLink(partial: Partial<LinkRow> = {}): LinkRow {
  return {
    id: partial.id ?? "link-p2",
    user_id: null,
    original_url: partial.original_url ?? "https://example.com/trip",
    title: partial.title ?? "제주 여행",
    thumbnail_url: null,
    domain: partial.domain ?? "naver.com",
    category: partial.category ?? "travel",
    actions: partial.actions ?? [
      { id: "open", label: "열기", kind: "open", href: "https://example.com/trip" },
    ],
    created_at: partial.created_at ?? new Date().toISOString(),
    expires_at: null,
  };
}

const travelOffer = resolveLinkMainOffer({
  link: seedLink({ title: "제주 D-1 출발" }),
  surface: "feed",
});
assert.equal(travelOffer.urgencyBypass, true);
assert.equal(
  shouldShowLinkMainHero({ offer: travelOffer, actionsRevealed: false }),
  true,
);

const gatedOffer = resolveLinkMainOffer({
  link: seedLink(),
  surface: "feed",
  actionsRevealed: false,
});
assert.equal(
  shouldShowLinkMainHero({ offer: gatedOffer, actionsRevealed: false }),
  gatedOffer.tier === "high",
);

const validWire: ActionArchitectWire = {
  thought: "test",
  strategy_applied: "MANUAL_CORE",
  template_id: "AIRPORT_TRAVEL_01",
  message: "ok",
  main_action: { type: "SAVE", label: "일정 확정", priority: 100 },
  shadow_actions: [],
};
assert.equal(validateArchitectWireAgainstPrm(validWire), true);

const invalidWire: ActionArchitectWire = {
  ...validWire,
  template_id: "NOT_A_REAL_TEMPLATE",
  main_action: { type: "FAKE", label: "bad", priority: 1 },
};
assert.equal(validateArchitectWireAgainstPrm(invalidWire), false);

console.log("test-prm-p2-slice: ok");

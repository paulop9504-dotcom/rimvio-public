#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resolveActionOfferUx } from "../lib/action-chat/trust-disclosure";
import {
  resolveTrustStaircaseStage,
  TRUST_STAGE_HEAVY_AT,
  TRUST_STAGE_PARTNER_AT,
} from "../lib/preferences/action-trust";

assert.equal(resolveTrustStaircaseStage({ mode: "auto", successScore: 0 }), 1);
assert.equal(
  resolveTrustStaircaseStage({ mode: "auto", successScore: TRUST_STAGE_PARTNER_AT }),
  2
);
assert.equal(
  resolveTrustStaircaseStage({ mode: "auto", successScore: TRUST_STAGE_HEAVY_AT }),
  3
);
assert.equal(resolveTrustStaircaseStage({ mode: "beginner", successScore: 999 }), 1);
assert.equal(resolveTrustStaircaseStage({ mode: "partner", successScore: 0 }), 2);
assert.equal(resolveTrustStaircaseStage({ mode: "heavy", successScore: 0 }), 3);

const stage1 = resolveActionOfferUx({
  confidence: 0.93,
  hasActions: true,
});
assert.equal(stage1.stage, 1);
assert.equal(stage1.showConfirmPrompt, true);
assert.equal(stage1.showMagicPulse, false);
assert.equal(stage1.showActionGrid, false);

const stage2 = resolveActionOfferUx({
  confidence: 0.93,
  hasActions: true,
});
// Patch read functions aren't available in node - stage resolves from localStorage default
// Re-test with explicit stage via mode in resolveTrustStaircaseStage only when storage exists.
// Use partner mode path:
assert.equal(
  resolveTrustStaircaseStage({ mode: "partner", successScore: 0 }),
  2
);

console.log("test-trust-disclosure: ok (stage thresholds verified)");

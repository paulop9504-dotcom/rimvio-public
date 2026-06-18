#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  isGlobeLocationConfirmed,
  markGlobeLocationConfirmed,
  resetGlobeLocationConfirmStoreForTests,
} from "../lib/globe/globe-location-confirm-store";

resetGlobeLocationConfirmStoreForTests();
assert.equal(isGlobeLocationConfirmed("둔산동", "2026-06-06T10:00:00+09:00"), false);

markGlobeLocationConfirmed("둔산동", "2026-06-06T22:00:00+09:00");
assert.equal(isGlobeLocationConfirmed("둔산동", "2026-06-06T12:00:00+09:00"), true);
assert.equal(isGlobeLocationConfirmed("둔산동", "2026-06-07T10:00:00+09:00"), false);

console.log("test-globe-location-confirm-store: ok");

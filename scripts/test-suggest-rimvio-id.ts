#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  pickSuggestedRimvioId,
  suggestRimvioIdFromEmail,
} from "../lib/onboarding/suggest-rimvio-id";

assert.equal(suggestRimvioIdFromEmail("paul.op9504@gmail.com"), "paul.op9504");
assert.equal(suggestRimvioIdFromEmail("9bad@gmail.com"), "r9bad");
assert.ok(pickSuggestedRimvioId({ email: "user@rimvio.app" }));

console.log("test-suggest-rimvio-id: ok");

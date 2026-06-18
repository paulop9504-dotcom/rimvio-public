#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { createCallAction } from "../lib/enrichers/action-factory";
import {
  buildContactActionLabel,
  extractTelDigits,
  resolveDialPrepTelHref,
  toDialPrepTelHref,
} from "../lib/enrichers/extract-phone";

assert.equal(extractTelDigits("042-544-1162"), "0425441162");
assert.equal(extractTelDigits("tel:+82425441162"), "0425441162");
assert.equal(extractTelDigits("telprompt:0425441162"), "0425441162");

assert.equal(buildContactActionLabel("0425441162"), "연락하기 (042-544-1162)");

assert.equal(toDialPrepTelHref("042-544-1162", "ios"), "telprompt:0425441162");
assert.equal(toDialPrepTelHref("042-544-1162", "android"), "tel:0425441162");
assert.equal(toDialPrepTelHref("042-544-1162"), "tel:0425441162");

const call = createCallAction("0425441162");
assert.match(call.label, /연락하기 \(042-544-1162\)/);
assert.equal(call.href, "tel:0425441162");
assert.equal(call.payload?.dialPrep, true);

const resolved = resolveDialPrepTelHref("tel:0425441162");
assert.equal(resolved, "tel:0425441162");

console.log("test-dial-prep-tel: ok");

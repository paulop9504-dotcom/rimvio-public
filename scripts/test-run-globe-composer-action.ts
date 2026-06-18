#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { runGlobeComposerAction } from "../lib/globe/run-globe-composer-action";

const navigate = runGlobeComposerAction("@길찾기 강남역");
assert.ok(navigate);
assert.match(navigate!.url, /kakao|map|naver|http/iu);

assert.equal(runGlobeComposerAction("그냥 메모"), null);

console.log("test-run-globe-composer-action: ok");

#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { copy } from "../lib/copy/human-ko";
import {
  STORY_FORBIDDEN_USER_FACING,
  STORY_L0,
  STORY_L1_TO_L3,
  STORY_L1_VERBS,
  buildStoryLayerPromptHeader,
} from "../lib/copy/story-layer";

assert.ok(STORY_L0.personal.en.includes("You were here"));
assert.ok(STORY_L1_VERBS.leaveTrace === "흔적 남기기");
assert.ok(STORY_L1_TO_L3[STORY_L1_VERBS.leaveTrace]?.includes("GlobeContextIngestBar"));

const header = buildStoryLayerPromptHeader("globe");
assert.ok(header.includes("Story Layer"));
assert.ok(header.includes("RFC_UNIVERSAL_PIN_SYSTEM"));

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (typeof value === "function") {
    return out;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) {
      collectStrings(nested, out);
    }
  }
  return out;
}

const globeCopy = collectStrings(copy.globe);
for (const forbidden of STORY_FORBIDDEN_USER_FACING) {
  for (const line of globeCopy) {
    assert.ok(
      !line.includes(forbidden),
      `copy.globe must not include forbidden "${forbidden}": ${line}`,
    );
  }
}

for (const line of globeCopy) {
  assert.ok(
    !line.includes("핀 박기"),
    `copy.globe hero strings should avoid "핀 박기": ${line}`,
  );
}

console.log("test-story-layer: ok");

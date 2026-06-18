#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildExperienceMentionComposerText,
  buildExperienceRunSearchHref,
  parseExperienceRunSearchParams,
} from "@/lib/feed/feed-experience-run-mentions";

assert.equal(
  buildExperienceMentionComposerText({ featureId: "navigate", place: "제주" }),
  "@길찾기 제주",
);
assert.equal(
  buildExperienceRunSearchHref({
    eventId: "jeju",
    featureId: "meal",
    place: "제주",
  }),
  "/search?run=mention&event=jeju&feature=meal&place=%EC%A0%9C%EC%A3%BC",
);

const params = new URLSearchParams("run=mention&event=e1&feature=navigate&place=제주");
const parsed = parseExperienceRunSearchParams(params);
assert.ok(parsed);
assert.equal(parsed?.eventId, "e1");
assert.equal(parsed?.featureId, "navigate");
assert.equal(parsed?.place, "제주");

console.log("test-feed-experience-run-mentions: ok");

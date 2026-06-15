import assert from "node:assert/strict";
import { lensActionCardVisual } from "../lib/peer-chat/lens-action-card-presentation";

assert.equal(lensActionCardVisual("navigate").icon, "map");
assert.equal(lensActionCardVisual("schedule").subtitle.includes("일정"), true);

console.log("test-lens-action-card-presentation: ok");

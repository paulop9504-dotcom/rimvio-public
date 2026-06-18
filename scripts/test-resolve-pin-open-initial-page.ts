import assert from "node:assert/strict";
import { resolvePinOpenInitialPage } from "../lib/globe/resolve-pin-open-initial-page";

assert.equal(
  resolvePinOpenInitialPage({
    eventId: "evt-1",
    fromMapMediaTap: false,
  }),
  "media",
);

assert.equal(
  resolvePinOpenInitialPage({
    eventId: "bridge-linked-abc",
    fromMapMediaTap: true,
  }),
  "media",
);

console.log("test-resolve-pin-open-initial-page: ok");

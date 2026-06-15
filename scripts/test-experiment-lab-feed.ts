#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { experimentLabLinks } from "../lib/demo/experiment-lab-links";

/** Mirrors reset-experiment-lab isCurrentLabFeed — user captures must not trigger lab reset. */
function isCurrentLabFeed(links: { id: string }[]) {
  const byId = new Map(links.map((link) => [link.id, link]));
  return experimentLabLinks.every((labLink) => byId.has(labLink.id));
}

const labOnly = experimentLabLinks.map((link) => ({ id: link.id }));
assert.equal(isCurrentLabFeed(labOnly), true);

const withCapture = [
  { id: "user-screenshot-capture-1" },
  ...labOnly,
];
assert.equal(isCurrentLabFeed(withCapture), true, "extra user links should keep lab feed valid");

const missingLab = [{ id: "user-screenshot-capture-1" }];
assert.equal(isCurrentLabFeed(missingLab), false);

console.log("test-experiment-lab-feed: ok");

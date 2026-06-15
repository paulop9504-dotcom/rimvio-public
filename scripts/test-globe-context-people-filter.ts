#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { matchesGlobeContextPeopleFilter } from "../lib/globe/globe-context-people-filter";
import { listGlobeContextPeerOptions } from "../lib/globe/list-globe-context-peer-options";

function event(id: string, peer: string): EventCandidate {
  return {
    id,
    title: id,
    category: "social",
    source: "message",
    lifecycle: "completed",
    confidence: 0.8,
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {
      globeManualContext: true,
      attendees: [peer],
    },
  };
}

const events = [event("a", "민수"), event("b", "민수"), event("c", "지연")];
const byId = new Map(events.map((row) => [row.id, row]));

assert.equal(matchesGlobeContextPeopleFilter("a", null, byId), true);
assert.equal(matchesGlobeContextPeopleFilter("a", "민수", byId), true);
assert.equal(matchesGlobeContextPeopleFilter("c", "민수", byId), false);

const peers = listGlobeContextPeerOptions(events);
assert.deepEqual(
  peers.map((row) => row.displayName),
  ["민수", "지연"],
);
assert.equal(peers[0]!.contextCount, 2);

console.log("test-globe-context-people-filter: ok");

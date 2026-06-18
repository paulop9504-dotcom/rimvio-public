#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { resolveAreaGeocodeCandidates } from "../lib/event-commit-gate/resolve-area-geocode-candidates";

async function main() {
  const rows = await resolveAreaGeocodeCandidates({ areaToken: "대치동", maxResults: 3 });
  assert.ok(Array.isArray(rows));
  console.log("test-area-geocode-parse: ok");
}

void main();

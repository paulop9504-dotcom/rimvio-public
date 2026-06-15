#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  markGoogleCalendarAutoSynced,
  shouldRunGoogleCalendarAutoSync,
} from "../lib/google-calendar/sync-throttle";

const storage = new Map<string, string>();

(globalThis as { sessionStorage?: Storage }).sessionStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => {
    storage.set(key, value);
  },
  removeItem: (key) => {
    storage.delete(key);
  },
  clear: () => storage.clear(),
  key: () => null,
  length: 0,
};

assert.equal(shouldRunGoogleCalendarAutoSync(1_000), true);

markGoogleCalendarAutoSynced(1_000);
assert.equal(shouldRunGoogleCalendarAutoSync(1_000 + 29 * 60 * 1000), false);
assert.equal(shouldRunGoogleCalendarAutoSync(1_000 + 31 * 60 * 1000), true);

console.log("test-google-calendar-sync-throttle: ok");

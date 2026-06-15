#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  canRunAlbumSyncOnNetwork,
  type AlbumSyncNetworkType,
} from "../lib/ingest/album-sync-network";
import {
  markAlbumAssetImported,
  readAlbumSyncPrefs,
  resetAlbumSyncPrefsForTests,
  writeAlbumSyncPrefs,
} from "../lib/preferences/album-sync";

resetAlbumSyncPrefsForTests();

const defaults = readAlbumSyncPrefs();
assert.equal(defaults.enabled, false);
assert.equal(defaults.networkPolicy, "wifi_only");
assert.equal(defaults.windowDays, 7);
assert.equal(defaults.resumeOnOpen, true);

writeAlbumSyncPrefs({ enabled: true, networkPolicy: "wifi_and_mobile" });
const saved = readAlbumSyncPrefs();
assert.equal(saved.enabled, true);
assert.equal(saved.networkPolicy, "wifi_and_mobile");

markAlbumAssetImported("media-42");
assert.equal(readAlbumSyncPrefs().importedAssetIds.includes("media-42"), true);

const cases: [AlbumSyncNetworkType, "wifi_only" | "wifi_and_mobile", boolean][] = [
  ["wifi", "wifi_only", true],
  ["cellular", "wifi_only", false],
  ["cellular", "wifi_and_mobile", true],
  ["none", "wifi_and_mobile", false],
];

for (const [network, policy, expected] of cases) {
  assert.equal(
    canRunAlbumSyncOnNetwork({ networkType: network, policy }),
    expected,
    `${network}/${policy}`,
  );
}

console.log("test-album-sync-prefs: ok");

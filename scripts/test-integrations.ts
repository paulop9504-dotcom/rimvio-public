#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  encryptSecretPayload,
  decryptSecretPayload,
} from "../lib/integrations/encrypt-secret";
import { maskSecret, pickPrimarySecret } from "../lib/integrations/mask-secret";
import {
  encodeOAuthState,
  decodeOAuthState,
} from "../lib/integrations/oauth-state";
import {
  isIntegrationProviderId,
  catalogEntryFor,
} from "../lib/integrations/catalog";
import {
  upsertLocalIntegration,
  readLocalIntegrations,
  removeLocalIntegration,
} from "../lib/integrations/integrations-client-store";

process.env.INTEGRATIONS_ENCRYPTION_KEY = "test-key-for-integrations";

const payload = { api_key: "sk-test-1234567890" };
const cipher = encryptSecretPayload(payload);
const roundtrip = decryptSecretPayload(cipher);
assert.equal(roundtrip.api_key, payload.api_key);

assert.equal(maskSecret("sk-abcdefghijklmnop"), "•••• mnop");
assert.equal(pickPrimarySecret({ api_key: "abc" }), "abc");

const state = encodeOAuthState({
  provider: "slack",
  next: "/welcome",
  userId: "user-1",
  sessionId: null,
});
const decoded = decodeOAuthState(state);
assert.ok(decoded);
assert.equal(decoded?.provider, "slack");

assert.ok(isIntegrationProviderId("notion"));
assert.ok(catalogEntryFor("slack")?.authKinds.includes("oauth"));

// Client store (memory path in node)
removeLocalIntegration("openweather");
upsertLocalIntegration({
  provider: "openweather",
  authKind: "api_key",
  secret: { api_key: "owm-test-key" },
});
const list = readLocalIntegrations();
assert.ok(list.some((item) => item.provider === "openweather"));
removeLocalIntegration("openweather");

console.log("test-integrations: ok");

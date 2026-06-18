#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { parseTurnIntent } from "../lib/action-chat/turn/parse-turn-intent";
import { resolveClientTurnRoute } from "../lib/action-chat/turn/resolve-client-turn-route";

function route(text: string, extra: Partial<Parameters<typeof resolveClientTurnRoute>[0]> = {}) {
  const turnIntent = parseTurnIntent(text, undefined, () => "decision");
  return resolveClientTurnRoute({
    sending: false,
    turnIntent,
    pendingAttachments: [],
    messages: [],
    routeToFeedPeerTalk: false,
    reviewGatePhase: null,
    ...extra,
  }).kind;
}

assert.equal(route(""), "noop");
assert.equal(route("hello", { routeToFeedPeerTalk: true }), "peer_talk");
assert.equal(route("@schedule 내일 3시"), "command_os");

console.log("test-client-turn-route: ok");

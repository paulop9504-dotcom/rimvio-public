#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { actionChatScopeId } from "../lib/action-chat/chat-store";

assert.equal(actionChatScopeId(null, "search"), "rimvio:search");
assert.equal(actionChatScopeId("link-1", "search"), "rimvio:search");
assert.equal(actionChatScopeId("link-1", "link"), "link-1");
assert.equal(actionChatScopeId(null, "free"), "free");

console.log("test-tab-architecture: ok");

#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { normalizeFriendContactQuery } from "../lib/peer-chat/normalize-friend-contact";
import { friendContactErrorMessage } from "../lib/peer-chat/friend-contact-errors";

assert.equal(normalizeFriendContactQuery("  @rimvio_test  "), "rimvio_test");
assert.equal(normalizeFriendContactQuery("010-1234-5678"), "010-1234-5678");
assert.ok(friendContactErrorMessage("not_registered").includes("Rimvio"));

console.log("test-normalize-friend-contact: ok");

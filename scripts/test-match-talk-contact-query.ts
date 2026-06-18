import assert from "node:assert/strict";
import { contactMatchesTalkQuery } from "../lib/peer-chat/match-talk-contact-query";
import type { PeerContact } from "../lib/context/peer-contact-types";

const monica: PeerContact = {
  peerThreadId: "peer-dm-a__b",
  displayName: "이미형",
  rimvioId: "monica57",
  emailLower: "0123mh486@gmail.com",
  createdAt: "",
  updatedAt: "",
};

assert.ok(contactMatchesTalkQuery(monica, "이"));
assert.ok(contactMatchesTalkQuery(monica, "m"));
assert.ok(contactMatchesTalkQuery(monica, "0"));
assert.ok(contactMatchesTalkQuery(monica, "monica"));
assert.ok(contactMatchesTalkQuery(monica, "0123"));
assert.ok(!contactMatchesTalkQuery(monica, "박"));

const roomLabel: PeerContact = {
  ...monica,
  displayName: "황정성",
  profileDisplayName: "이미형",
  roomDisplayName: "황정성",
};
assert.ok(contactMatchesTalkQuery(roomLabel, "이"));
assert.ok(contactMatchesTalkQuery(roomLabel, "황"));

console.log("test-match-talk-contact-query: ok");

import assert from "node:assert/strict";
import { parseFriendContactQuery } from "@/lib/peer-chat/normalize-friend-contact";

const phoneId = parseFriendContactQuery("01024872770 sypark");
assert.equal(phoneId.primary, "01024872770");
assert.equal(phoneId.rimvioIdHint, "sypark");

const idOnly = parseFriendContactQuery("monica57");
assert.equal(idOnly.primary, "monica57");
assert.equal(idOnly.rimvioIdHint, null);

console.log("test-parse-friend-contact: ok");

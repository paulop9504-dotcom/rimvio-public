import assert from "node:assert/strict";
import { parseActivePeerTalkComposer } from "../lib/peer-chat/active-peer-talk-composer";
import { filterPeerContactsForTalk } from "../lib/peer-chat/filter-talk-contacts";

assert.deepEqual(parseActivePeerTalkComposer("@톡"), { query: "" });
assert.deepEqual(parseActivePeerTalkComposer("안녕 @톡 박"), { query: "박" });
assert.deepEqual(parseActivePeerTalkComposer("@톡 박성"), { query: "박성" });
assert.deepEqual(parseActivePeerTalkComposer("@톡박성용"), { query: "박성용" });
assert.equal(parseActivePeerTalkComposer("@톡 박성용 하이"), null);
assert.equal(parseActivePeerTalkComposer("@친추 박"), null);

// filter is read-only against localStorage in node — smoke only when empty
const empty = filterPeerContactsForTalk("박");
assert.ok(Array.isArray(empty));

console.log("test-active-peer-talk-composer: ok");

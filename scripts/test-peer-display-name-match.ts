import assert from "node:assert/strict";
import { peerDisplayNamesMatch } from "@/lib/peer-chat/match-peer-display-name";
import { resolveCanonicalPeerThreadFromSocialLayer } from "@/lib/peer-chat/resolve-canonical-peer-thread";

assert.equal(
  peerDisplayNamesMatch("황정성", "황정성 (Kind정성)"),
  true,
);
assert.equal(
  peerDisplayNamesMatch("Kind정성", "황정성 (Kind정성)"),
  true,
);
assert.equal(peerDisplayNamesMatch("민수", "지연"), false);

const dmThread =
  "peer-dm-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa__bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

assert.equal(
  resolveCanonicalPeerThreadFromSocialLayer(
    {
      peerThreadId: "peer-hwang-abc12345",
      displayName: "황정성",
      rimvioId: null,
    },
    {
      pinned: [
        {
          friendId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          threadId: dmThread,
          displayName: "황정성 (Kind정성)",
          rimvioId: "kindjung",
          avatarUrl: null,
          bubbleState: "idle",
          isPinned: true,
          pinSlot: 0,
          unreadCount: 0,
          lastInteractionAt: new Date().toISOString(),
          messagesPurgeAfter: null,
        },
      ],
      archive: [],
    },
  ),
  dmThread,
);

console.log("test-peer-display-name-match: ok");

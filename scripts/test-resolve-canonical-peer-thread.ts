import assert from "node:assert/strict";
import { resolveCanonicalPeerThreadFromSocialLayer } from "../lib/peer-chat/resolve-canonical-peer-thread";

const dmThread = "peer-dm-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa__bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const legacy = "peer-hwang-abc12345";

const layer = {
  pinned: [
    {
      friendId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      threadId: dmThread,
      displayName: "황정성 (Kind정성)",
      rimvioId: "kindjung",
      avatarUrl: null,
      bubbleState: "idle" as const,
      isPinned: true,
      pinSlot: 0,
      unreadCount: 0,
      lastInteractionAt: new Date().toISOString(),
      messagesPurgeAfter: null,
    },
  ],
  archive: [],
};

const resolved = resolveCanonicalPeerThreadFromSocialLayer(
  {
    peerThreadId: legacy,
    displayName: "황정성 (Kind정성)",
    rimvioId: null,
  },
  layer,
);

assert.equal(resolved, dmThread);

const alreadyDm = resolveCanonicalPeerThreadFromSocialLayer(
  {
    peerThreadId: dmThread,
    displayName: "황정성",
    rimvioId: null,
  },
  layer,
);
assert.equal(alreadyDm, dmThread);

console.log("test-resolve-canonical-peer-thread: ok");

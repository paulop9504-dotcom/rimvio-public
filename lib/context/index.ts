export {
  addPeerContact,
  readPeerContacts,
  getPeerContactById,
  findPeerContactByDisplayName,
  removePeerContact,
  syncPeerContactsFromRoster,
  PEER_CONTACT_SOFT_CAP,
} from "@/lib/context/peer-contact-store";

export type { PeerContact, PeerContactBook } from "@/lib/context/peer-contact-types";

export {
  FIVE_PEER_ROOMS_PRODUCT,
  isActivePeerRoom,
  isKnownPeerContact,
  isHubRoomSurface,
} from "@/lib/context/five-peer-rooms-product";

export {
  PINNED_PEER_SLOTS,
  type PeerThreadSettings,
  type PinnedPeerRoster,
  type PinnedPeerSlot,
  type PeerStorageMode,
  type PeerThreadPolicyInput,
} from "@/lib/context/peer-thread-types";

export {
  emptyPinnedRoster,
  ensureFiveHubSlots,
  findPinnedSlot,
  findConnectedPeerSlot,
  findSlotByPeerId,
  countConnectedPeers,
  rosterHasRoom,
  rosterHasVacantSlot,
  connectPeerToHub,
  pinPeerToRoster,
  unpinPeerFromHub,
  unpinPeerFromRoster,
  assignPeerToHubSlot,
  hubSlotAt,
  resolvePinnedDisplayName,
  purgePendingLabel,
  normalizePinnedRoster,
} from "@/lib/context/pinned-peer-roster";

export {
  UNPIN_PEER_RETENTION_DAYS,
  purgeAfterIso,
  daysUntilPurge,
} from "@/lib/context/hub-room-retention";

export { purgePeerThreadData } from "@/lib/context/purge-peer-thread-data";

export type { HubRoomConnection, HubRoomSlot } from "@/lib/context/peer-thread-types";

export {
  buildFivePeerHubNodes,
  FIVE_PEER_HUB_ANGLES_DEG,
} from "@/lib/context/five-peer-hub-layout";

export {
  isPinnedFullStorage,
  peerStorageMode,
  shouldRunAiLens,
  shouldAnalyzePeerAiLens,
  shouldPersistPeerMessageLog,
  shouldRunEphemeralExtract,
  shouldShowContextRail,
  canImportPeerAtMention,
  applyPinToggleIntent,
  applyAiLensToggle,
} from "@/lib/context/peer-thread-policy";

export {
  defaultPeerThreadSettings,
  readPeerThreadSettings,
  writePeerThreadSettings,
  readPinnedRoster,
  writePinnedRoster,
  getOrCreatePeerThreadSettings,
  setPeerThreadAiLens,
  setPeerThreadPinned,
  assignPeerToHubAndPin,
  addPeerContactOnly,
  syncPinnedRoster,
} from "@/lib/context/peer-thread-settings-store";

export {
  readPeerMessageLog,
  appendPeerMessage,
  writePeerMessageLog,
} from "@/lib/context/peer-message-log";

export type { PeerMessage, PeerMessageAuthor } from "@/lib/context/peer-message-types";

export {
  parsePinnedPeerMentions,
  isReservedPeerMentionToken,
} from "@/lib/context/parse-pinned-peer-mention";

export { loadPinnedPeerContext } from "@/lib/context/load-pinned-peer-context";

export {
  buildPeerComposerContextBlock,
  queuePeerMentionForAiChat,
  consumePendingPeerMention,
} from "@/lib/context/build-peer-composer-context";

export {
  suggestPeerMentions,
  activePeerMentionQuery,
} from "@/lib/context/suggest-peer-mentions";

export type { SetPeerThreadPinnedResult } from "@/lib/context/peer-thread-settings-store";

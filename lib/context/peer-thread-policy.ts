import {
  FIVE_PEER_ROOMS_PRODUCT,
  isActivePeerRoom,
  isKnownPeerContact,
} from "@/lib/context/five-peer-rooms-product";
import { findPinnedSlot } from "@/lib/context/pinned-peer-roster";
import type {
  PeerStorageMode,
  PeerThreadPolicyInput,
  PeerThreadSettings,
} from "@/lib/context/peer-thread-types";

/** Read-only policy — no SSOT mutation. */

export function isPinnedFullStorage(input: PeerThreadPolicyInput): boolean {
  if (FIVE_PEER_ROOMS_PRODUCT) {
    return isActivePeerRoom(input);
  }
  const { settings, roster } = input;
  return (
    settings.isPinned &&
    Boolean(findPinnedSlot(roster, settings.peerThreadId))
  );
}

export function peerStorageMode(input: PeerThreadPolicyInput): PeerStorageMode {
  if (FIVE_PEER_ROOMS_PRODUCT) {
    if (isActivePeerRoom(input)) {
      return "pinned_full";
    }
    if (isKnownPeerContact(input)) {
      return "contact_basic";
    }
    return "none";
  }
  if (isPinnedFullStorage(input)) {
    return "pinned_full";
  }
  if (input.settings.aiLensEnabled) {
    return "ephemeral";
  }
  return "none";
}

/** 맥락 적분·Context Rail — pinned + lens ON only. */
export function shouldRunAiLens(input: PeerThreadPolicyInput): boolean {
  if (!isPinnedFullStorage(input)) {
    return false;
  }
  return input.settings.aiLensEnabled;
}

/**
 * DM Room — bubble suggestions only when this friend’s AI 렌즈 is ON (per-thread toggle).
 */
export function shouldAnalyzePeerAiLens(input: PeerThreadPolicyInput): boolean {
  return input.settings.aiLensEnabled;
}

/** Any known friend can persist chat locally; AI import only when pinned. */
export function shouldPersistPeerMessageLog(input: PeerThreadPolicyInput): boolean {
  if (FIVE_PEER_ROOMS_PRODUCT) {
    return isKnownPeerContact(input) || isActivePeerRoom(input);
  }
  return isPinnedFullStorage(input);
}

export function shouldRunEphemeralExtract(input: PeerThreadPolicyInput): boolean {
  if (FIVE_PEER_ROOMS_PRODUCT) {
    return false;
  }
  return (
    input.settings.aiLensEnabled && !isPinnedFullStorage(input)
  );
}

export function shouldShowContextRail(input: PeerThreadPolicyInput): boolean {
  return shouldRunAiLens(input);
}

/** AI 창 @이름 — pinned 5 only. */
export function canImportPeerAtMention(input: PeerThreadPolicyInput): boolean {
  return isPinnedFullStorage(input);
}

export type SetPinnedIntentResult =
  | { allowed: true; settings: PeerThreadSettings }
  | {
      allowed: false;
      reason: "roster_full";
      settings: PeerThreadSettings;
    };

export function applyPinToggleIntent(input: {
  settings: PeerThreadSettings;
  nextPinned: boolean;
}): SetPinnedIntentResult {
  return {
    allowed: true,
    settings: {
      ...input.settings,
      isPinned: input.nextPinned,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function applyAiLensToggle(input: {
  settings: PeerThreadSettings;
  nextEnabled: boolean;
}): PeerThreadSettings {
  return {
    ...input.settings,
    aiLensEnabled: input.nextEnabled,
    updatedAt: new Date().toISOString(),
  };
}

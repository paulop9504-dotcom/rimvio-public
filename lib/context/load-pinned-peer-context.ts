import { findPinnedSlot, resolvePinnedDisplayName } from "@/lib/context/pinned-peer-roster";
import {
  canImportPeerAtMention,
  shouldRunAiLens,
} from "@/lib/context/peer-thread-policy";
import { readPeerMessageLog } from "@/lib/context/peer-message-log";
import {
  getOrCreatePeerThreadSettings,
  readPinnedRoster,
} from "@/lib/context/peer-thread-settings-store";
import type { PinnedPeerSlot } from "@/lib/context/peer-thread-types";

const TRANSCRIPT_TAIL = 24;

export type LoadPinnedPeerContextResult =
  | {
      ok: true;
      slot: PinnedPeerSlot;
      displayName: string;
      transcriptBlock: string;
      messageCount: number;
      aiLensOn: boolean;
    }
  | { ok: false; reason: "not_pinned"; token: string }
  | { ok: false; reason: "import_blocked"; token: string; displayName: string };

function formatTranscript(
  displayName: string,
  messages: ReturnType<typeof readPeerMessageLog>["messages"]
): string {
  const tail = messages.slice(-TRANSCRIPT_TAIL);
  if (tail.length === 0) {
    return `(「${displayName}」 방에 아직 저장된 대화가 없어요.)`;
  }
  return tail
    .map((m) => {
      const who = m.author === "me" ? "나" : displayName;
      return `${who}: ${m.body}`;
    })
    .join("\n");
}

/** Read-only — loads roster + message log for @import. */
export function loadPinnedPeerContext(
  mentionToken: string
): LoadPinnedPeerContextResult {
  const roster = readPinnedRoster();
  const slot =
    resolvePinnedDisplayName(roster, mentionToken) ??
    findPinnedSlot(roster, mentionToken);

  if (!slot) {
    return { ok: false, reason: "not_pinned", token: mentionToken };
  }

  const settings = getOrCreatePeerThreadSettings({
    peerThreadId: slot.peerThreadId,
    displayName: slot.displayName,
  });

  if (
    !canImportPeerAtMention({
      settings,
      roster,
    })
  ) {
    return {
      ok: false,
      reason: "import_blocked",
      token: mentionToken,
      displayName: slot.displayName,
    };
  }

  const log = readPeerMessageLog(slot.peerThreadId);
  const aiLensOn = shouldRunAiLens({ settings, roster });

  return {
    ok: true,
    slot,
    displayName: slot.displayName,
    transcriptBlock: formatTranscript(slot.displayName, log.messages),
    messageCount: log.messages.length,
    aiLensOn,
  };
}

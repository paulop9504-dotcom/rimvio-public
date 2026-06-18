import { loadPinnedPeerContext } from "@/lib/context/load-pinned-peer-context";
import { parsePinnedPeerMentions } from "@/lib/context/parse-pinned-peer-mention";

export type BuildPeerComposerContextResult = {
  block: string | null;
  resolvedNames: string[];
  blockedTokens: Array<{ token: string; reason: "not_pinned" | "import_blocked" }>;
};

/** Read-only — for AI orchestrate composerContext attachment. */
export function buildPeerComposerContextBlock(
  message: string
): BuildPeerComposerContextResult {
  const tokens = parsePinnedPeerMentions(message);
  if (tokens.length === 0) {
    return { block: null, resolvedNames: [], blockedTokens: [] };
  }

  const sections: string[] = [];
  const resolvedNames: string[] = [];
  const blockedTokens: BuildPeerComposerContextResult["blockedTokens"] = [];

  for (const token of tokens) {
    const loaded = loadPinnedPeerContext(token);
    if (loaded.ok === false) {
      blockedTokens.push({ token, reason: loaded.reason });
      continue;
    }
    resolvedNames.push(loaded.displayName);
    sections.push(
      [
        `[친한 친구 @${loaded.displayName} · 슬롯 ${loaded.slot.slotIndex + 1}/5]`,
        `저장된 메시지 ${loaded.messageCount}건 · AI 렌즈 ${loaded.aiLensOn ? "ON" : "OFF"}`,
        loaded.transcriptBlock,
      ].join("\n")
    );
  }

  if (sections.length === 0) {
    return { block: null, resolvedNames, blockedTokens };
  }

  return {
    block: [`[고정 친구 대화 맥락 — 원문은 이 기기에만 저장]`, ...sections].join(
      "\n\n"
    ),
    resolvedNames,
    blockedTokens,
  };
}

export const PENDING_PEER_MENTION_KEY = "rimvio.pending-peer-mention.v1";

export function queuePeerMentionForAiChat(displayName: string) {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(PENDING_PEER_MENTION_KEY, displayName.trim());
}

export function consumePendingPeerMention(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = sessionStorage.getItem(PENDING_PEER_MENTION_KEY);
  if (!raw) {
    return null;
  }
  sessionStorage.removeItem(PENDING_PEER_MENTION_KEY);
  return raw;
}

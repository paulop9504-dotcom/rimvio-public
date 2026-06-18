/** @displayName tokens — Pinned 5 only; reserved system tokens excluded. */

import { isMentionFeatureToken } from "@/lib/event-kernel/action-contracts/mention-feature-registry";
import { isKnownCommandOsToken } from "@/lib/command-os/command-os-tokens";

const RESERVED_LOWER = new Set([
  "캘린더",
  "calendar",
  "cal",
  "일정",
  "schedule",
]);

const MENTION_PATTERN = /@([^\s@]+)/gu;

export type ParsedPeerMention = {
  token: string;
  start: number;
  end: number;
};

export function isReservedPeerMentionToken(token: string): boolean {
  const normalized = token.trim().toLowerCase();
  return (
    RESERVED_LOWER.has(normalized) ||
    isKnownCommandOsToken(normalized) ||
    isMentionFeatureToken(normalized)
  );
}

/** Unique mention tokens in order of appearance. */
export function parsePinnedPeerMentions(text: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const match of text.matchAll(MENTION_PATTERN)) {
    const token = match[1]?.trim();
    if (!token || isReservedPeerMentionToken(token) || seen.has(token)) {
      continue;
    }
    seen.add(token);
    tokens.push(token);
  }
  return tokens;
}

export function parsePinnedPeerMentionSpans(text: string): ParsedPeerMention[] {
  const spans: ParsedPeerMention[] = [];
  for (const match of text.matchAll(MENTION_PATTERN)) {
    const token = match[1]?.trim();
    if (!token || isReservedPeerMentionToken(token)) {
      continue;
    }
    spans.push({
      token,
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
    });
  }
  return spans;
}

import { resolveMentionFeature } from "@/lib/event-kernel/action-contracts/mention-feature-registry";

export type ComposerMentionSegmentKind = "plain" | "mention-valid";

export type ComposerMentionSegment = {
  kind: ComposerMentionSegmentKind;
  text: string;
};

/** @ only at line start or after whitespace — avoids `user@email.com`. */
const MENTION_PATTERN = /(^|\s)(@[^\s@]*)/gu;

/**
 * Split composer text for mirror highlighting.
 * Typing stays white; only a completed registry token turns cyan.
 */
export function segmentComposerMentions(text: string): ComposerMentionSegment[] {
  if (!text) {
    return [];
  }

  const segments: ComposerMentionSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(MENTION_PATTERN)) {
    const start = match.index ?? 0;
    const prefix = match[1] ?? "";
    const mentionText = match[2] ?? "";

    if (start > cursor) {
      segments.push({ kind: "plain", text: text.slice(cursor, start) });
    }

    if (prefix) {
      segments.push({ kind: "plain", text: prefix });
    }

    if (mentionText.length > 1) {
      const token = mentionText.slice(1);
      segments.push({
        kind: resolveMentionFeature(token) ? "mention-valid" : "plain",
        text: mentionText,
      });
    } else {
      segments.push({ kind: "plain", text: mentionText });
    }

    cursor = start + match[0].length;
  }

  if (cursor < text.length) {
    segments.push({ kind: "plain", text: text.slice(cursor) });
  }

  return segments;
}
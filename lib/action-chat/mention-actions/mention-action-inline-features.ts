import { SLIM_INLINE_ACTION_FEATURE_IDS } from "@/lib/inside-out/slim-command-protocol";

/** Feature ids handled by the generic inline @ action chip (slim protocol). */

export const MENTION_ACTION_INLINE_FEATURE_IDS = new Set<string>(
  SLIM_INLINE_ACTION_FEATURE_IDS,
);

const DEDICATED_LOCAL_INLINE_FEATURE_IDS = new Set([
  "reminder",
  "navigate",
  "schedule",
  "transfer",
  "parking",
  "linksheet",
  "calendar",
  "end_peer_talk",
]);

export function isMentionActionInlineFeature(featureId: string): boolean {
  return MENTION_ACTION_INLINE_FEATURE_IDS.has(featureId);
}

export function isLocalInlineMentionFeature(featureId: string): boolean {
  return (
    DEDICATED_LOCAL_INLINE_FEATURE_IDS.has(featureId) ||
    MENTION_ACTION_INLINE_FEATURE_IDS.has(featureId)
  );
}

export const MENTION_ACTION_ICONS: Record<string, string> = {
  navigate: "🧭",
  meal: "🍽",
  schedule: "📋",
  reminder: "🔔",
  transfer: "💸",
  parking: "🅿️",
  taxi: "🚕",
  link: "🔗",
  dutch: "🧮",
  delivery: "🍔",
  pickup: "☕",
  receipt: "🧾",
  gas: "⛽",
  station: "🚇",
  linksheet: "📊",
  manual: "📖",
  calendar: "📅",
  friend_add: "👋",
  peer_talk: "💬",
  group_talk: "👥",
  todo: "✅",
  end_peer_talk: "↩️",
};

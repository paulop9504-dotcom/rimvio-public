import type {
  ConfirmationExtractedData,
  LocationConfirmUxWire,
  LocationSuggestion,
} from "@/lib/action-chat/confirmation-types";
import { rankLocationSuggestions } from "@/lib/corrections/score-location-match";

const QUICK_PICK_MIN = 72;
const QUICK_PICK_GAP = 18;
const INLINE_PICK_MIN = 38;
const MAX_INLINE = 3;

function shortBranchLabel(suggestion: LocationSuggestion): string {
  if (suggestion.branch?.trim()) {
    return suggestion.branch.trim();
  }
  const parts = suggestion.label.split(/\s+/);
  if (parts.length >= 2) {
    return parts.slice(1).join(" ").slice(0, 22);
  }
  return suggestion.label.slice(0, 22);
}

function buildInlinePrompt(subject: string): string {
  const trimmed = subject.trim().slice(0, 18);
  return `${trimmed} — 어느 지점일까요?`;
}

function buildQuickPrompt(suggestion: LocationSuggestion): string {
  const branch = shortBranchLabel(suggestion);
  return `${branch}으로 갈까요?`;
}

/**
 * Low-friction confirm UX:
 * - quick_pick: one obvious match → single primary tap (+ subtle alts)
 * - inline_pick: 2–3 close matches → chip row, one tap = done
 * - classic: no good candidates → legacy yes/no
 */
export function planLocationConfirmUx(input: {
  suggestions: LocationSuggestion[];
  extracted: ConfirmationExtractedData;
  message: string;
}): LocationConfirmUxWire {
  const ranked = rankLocationSuggestions(input.suggestions, {
    extracted: input.extracted,
    message: input.message,
  }).filter((entry) => entry.score > 0);

  if (ranked.length === 0) {
    return {
      mode: "classic",
      prompt: "정확한 지점을 골라 주세요.",
      suggestions: [],
    };
  }

  const top = ranked[0]!;
  const second = ranked[1];

  if (
    top.score >= QUICK_PICK_MIN &&
    (!second || top.score - second.score >= QUICK_PICK_GAP)
  ) {
    const alts = ranked.slice(1, 3).map((entry) => entry.suggestion);
    return {
      mode: "quick_pick",
      prompt: buildQuickPrompt(top.suggestion),
      recommended_id: top.suggestion.id,
      suggestions: [top.suggestion, ...alts],
    };
  }

  const inlineCandidates = ranked
    .filter((entry) => entry.score >= INLINE_PICK_MIN)
    .slice(0, MAX_INLINE)
    .map((entry) => entry.suggestion);

  if (inlineCandidates.length >= 2) {
    const subject =
      input.extracted.place_name?.trim() ||
      input.message.trim().slice(0, 16) ||
      "이 장소";
    return {
      mode: "inline_pick",
      prompt: buildInlinePrompt(subject),
      suggestions: inlineCandidates,
    };
  }

  if (ranked.length === 1) {
    return {
      mode: "quick_pick",
      prompt: buildQuickPrompt(top.suggestion),
      recommended_id: top.suggestion.id,
      suggestions: [top.suggestion],
    };
  }

  return {
    mode: "inline_pick",
    prompt: buildInlinePrompt(input.extracted.place_name ?? "장소"),
    suggestions: ranked.slice(0, MAX_INLINE).map((entry) => entry.suggestion),
  };
}

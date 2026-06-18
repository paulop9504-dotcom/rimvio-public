import { buildDeepLinkBubbleCandidates } from "@/lib/peer-chat/ai-lens/build-bubble-candidates";
import {
  detectLensMessageContext,
  emptyLensThreadContext,
} from "@/lib/peer-chat/ai-lens/detect-thread-context";
import {
  lensActionFrequencyBoost,
  lensUserHistoryWeight,
} from "@/lib/peer-chat/ai-lens/lens-user-history";
import type {
  DeepLinkBubbleCandidate,
  PeerAiLensAnalysis,
} from "@/lib/peer-chat/ai-lens/types";
import type { PeerMessage } from "@/lib/context/peer-message-types";

export const MAX_LENS_BUBBLES = 3;

function contextScore(candidate: DeepLinkBubbleCandidate): number {
  return candidate.confidence;
}

function rankScore(candidate: DeepLinkBubbleCandidate): number {
  const history = lensUserHistoryWeight(candidate.actionType);
  const frequency = lensActionFrequencyBoost(candidate.actionType);
  return (
    contextScore(candidate) * history * frequency
  );
}

export function rankDeepLinkBubbleCandidates(
  raw: readonly DeepLinkBubbleCandidate[],
): DeepLinkBubbleCandidate[] {
  return [...raw]
    .map((candidate) => ({
      ...candidate,
      score: rankScore(candidate),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, MAX_LENS_BUBBLES);
}

/** Pure read: analyze thread → ranked bubble candidates (no execution). */
export function analyzePeerThreadForLens(
  messages: readonly PeerMessage[],
  referenceDate: Date = new Date(),
  windowSize = 12,
): PeerAiLensAnalysis {
  const slice = messages.slice(-windowSize);
  const candidatesByMessageId: Record<string, DeepLinkBubbleCandidate[]> = {};
  let anchorMessageId: string | null = null;
  let context = emptyLensThreadContext();

  for (const message of slice) {
    const msgContext = detectLensMessageContext(message, referenceDate);
    if (!msgContext.anchorMessageId) {
      continue;
    }
    const ranked = rankDeepLinkBubbleCandidates(
      buildDeepLinkBubbleCandidates(msgContext),
    );
    if (ranked.length === 0) {
      continue;
    }
    candidatesByMessageId[message.id] = ranked;
    anchorMessageId = message.id;
    context = msgContext;
  }

  return {
    anchorMessageId,
    candidates: anchorMessageId
      ? (candidatesByMessageId[anchorMessageId] ?? [])
      : [],
    candidatesByMessageId,
    context,
  };
}

import type {
  DeepLinkBubbleCandidate,
  LensActionType,
} from "@/lib/peer-chat/ai-lens/types";

/** One-tap deeplink — compact chip, not reel-style media card. */
const SIMPLE_LENS_ACTIONS: ReadonlySet<LensActionType> = new Set([
  "navigate",
  "schedule",
  "movie_schedule",
  "open_link",
  "transfer",
  "save_resource",
]);

export function isSimpleLensBubbleCandidate(
  candidate: DeepLinkBubbleCandidate,
): boolean {
  return SIMPLE_LENS_ACTIONS.has(candidate.actionType);
}

export function partitionLensBubbleCandidates(
  candidates: readonly DeepLinkBubbleCandidate[],
): {
  simple: DeepLinkBubbleCandidate[];
  rich: DeepLinkBubbleCandidate[];
} {
  const simple: DeepLinkBubbleCandidate[] = [];
  const rich: DeepLinkBubbleCandidate[] = [];
  for (const candidate of candidates) {
    if (isSimpleLensBubbleCandidate(candidate)) {
      simple.push(candidate);
    } else {
      rich.push(candidate);
    }
  }
  return { simple, rich };
}

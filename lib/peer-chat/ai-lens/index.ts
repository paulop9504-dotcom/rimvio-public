export type {
  DeepLinkBubbleCandidate,
  LensActionType,
  LensIntentKind,
  LensThreadContext,
  PeerAiLensAnalysis,
} from "@/lib/peer-chat/ai-lens/types";
export {
  analyzePeerThreadForLens,
  rankDeepLinkBubbleCandidates,
  MAX_LENS_BUBBLES,
} from "@/lib/peer-chat/ai-lens/rank-lens-bubbles";
export {
  detectLensThreadContext,
  hasActionableLensIntent,
} from "@/lib/peer-chat/ai-lens/detect-thread-context";
export { buildDeepLinkBubbleCandidates } from "@/lib/peer-chat/ai-lens/build-bubble-candidates";
export { executeDeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/execute-lens-bubble";
export {
  lensUserHistoryWeight,
  recordLensBubbleClick,
  recordLensBubbleShown,
  resetLensUserHistoryForTests,
} from "@/lib/peer-chat/ai-lens/lens-user-history";

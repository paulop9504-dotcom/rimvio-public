/** Rimvio commit / approval speech tiers — intent 확정 → 등록 → 실행 승인 */

export type CommitSpeechTier =
  | "hard_commit"
  | "soft_commit"
  | "tiki_taka_approval"
  | "action_trigger"
  | "implicit_commit"
  | "emotional_commit"
  | "weak_commit";

export type CommitSpeechAct = "APPROVE" | "REJECT" | "NONE";

export type CommitPhraseEntry = {
  tier: CommitSpeechTier;
  phrase: string;
  confidence: number;
};

export type CommitSpeechAnalysis = {
  act: CommitSpeechAct;
  tier?: CommitSpeechTier;
  confidence: number;
  matchedPhrase?: string;
};

export const COMMIT_TIER_CONFIDENCE: Record<CommitSpeechTier, number> = {
  hard_commit: 1,
  action_trigger: 0.95,
  tiki_taka_approval: 0.88,
  implicit_commit: 0.85,
  soft_commit: 0.75,
  emotional_commit: 0.7,
  weak_commit: 0.55,
};

/** Minimum confidence to treat as execution approval when context is pending. */
export const DEFAULT_EXECUTION_APPROVAL_THRESHOLD = 0.55;

/** Minimum confidence for action-grid / progressive disclosure confirm. */
export const ACTION_UI_CONFIRM_THRESHOLD = 0.75;

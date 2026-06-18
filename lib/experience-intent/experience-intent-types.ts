/** Rule-based experience purpose — no LLM. */

export const EXPERIENCE_INTENTS = [
  "wedding",
  "travel",
  "business",
  "meeting",
  "birthday",
  "hospital",
  "school",
  "sports",
  "family",
  "date",
  "food",
  "concert",
  "funeral",
  "other",
] as const;

export type ExperienceIntent = (typeof EXPERIENCE_INTENTS)[number];

export type IntentEvidenceKind =
  | "title"
  | "description"
  | "place"
  | "category"
  | "calendar"
  | "participants"
  | "peer_thread"
  | "captures"
  | "dwell"
  | "gps";

export type IntentEvidence = {
  kind: IntentEvidenceKind;
  signal: string;
  weight: number;
  source: string;
};

export type IntentRunnerUp = {
  intent: ExperienceIntent;
  score: number;
};

export type IntentResolution = {
  intent: ExperienceIntent;
  confidence: number;
  score: number;
  runnerUp: IntentRunnerUp | null;
  evidence: readonly IntentEvidence[];
  resolvedAt: string;
};

export type IntentScoreEntry = {
  intent: ExperienceIntent;
  score: number;
  evidence: IntentEvidence[];
};

export type IntentScoreboard = {
  entries: readonly IntentScoreEntry[];
  winner: IntentScoreEntry;
  runnerUp: IntentScoreEntry | null;
};

export const EXPERIENCE_INTENT_META_KEYS = {
  intent: "experienceIntent",
  confidence: "experienceIntentConfidence",
  score: "experienceIntentScore",
  evidence: "experienceIntentEvidence",
  runnerUp: "experienceIntentRunnerUp",
  resolvedAt: "experienceIntentResolvedAt",
} as const;

/** Minimum winner score to avoid collapsing to `other`. */
export const INTENT_MIN_WIN_SCORE = 35;

/** Score at or above which confidence reaches 100. */
export const INTENT_CONFIDENCE_FULL_SCORE = 90;

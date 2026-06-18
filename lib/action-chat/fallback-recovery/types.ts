export type FallbackRecoveryCandidate =
  | "career_planning"
  | "education_planning"
  | "counseling"
  | "meal_decision"
  | "schedule_planning"
  | "general_decision"
  | "exploration";

export type FallbackRecoveryInference = {
  primary: FallbackRecoveryCandidate;
  candidates: FallbackRecoveryCandidate[];
  roleHint?: string;
};

export type FallbackRecoveryFlags = {
  recovered: boolean;
  inference: FallbackRecoveryInference | null;
};

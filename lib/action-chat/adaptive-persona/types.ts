/** Adaptive Persona — tone only, never routing. */
export type PersonaToneMode = "tiki_taka" | "execution" | "vitality";

export type ConversationStage =
  | "exploration"
  | "decision"
  | "execution"
  | "counseling";

export type PersonaContext = {
  mode: PersonaToneMode;
  stage: ConversationStage;
};

export type PersonaResultHint = {
  source?: "openai" | "rules" | "conversation";
  intent?: string;
  pendingConfirm?: boolean;
  hasActions?: boolean;
  actionsRevealed?: boolean;
};

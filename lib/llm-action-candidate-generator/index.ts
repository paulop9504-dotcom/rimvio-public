export type {
  ActionCategoryHint,
  CandidateDomain,
  LlmActionCandidateInput,
  LlmActionCandidateResult,
  LlmActionCandidateWire,
  LlmCandidateGeneratorWire,
} from "@/lib/llm-action-candidate-generator/types";

export {
  detectCandidateDomain,
  isLlmCandidateDomainEnabled,
} from "@/lib/llm-action-candidate-generator/detect-candidate-domain";

export {
  generateActionCandidates,
  generateActionCandidatesSync,
  isLlmActionCandidatesEnabled,
} from "@/lib/llm-action-candidate-generator/generate-action-candidates";

export {
  generateRuleBasedActionCandidates,
  categoryHintToTier,
} from "@/lib/llm-action-candidate-generator/rule-generate-candidates";

export {
  llmCandidatesToOverlayActions,
  mergeOverlayActionPools,
} from "@/lib/llm-action-candidate-generator/to-overlay-actions";

export {
  LLM_ACTION_CANDIDATE_SYSTEM_PROMPT,
  buildLlmCandidateUserPrompt,
} from "@/lib/llm-action-candidate-generator/system-prompt";

export {
  mergeCandidatePools,
  normalizeLlmCandidates,
} from "@/lib/llm-action-candidate-generator/validate-candidates";

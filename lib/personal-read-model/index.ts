/**
 * Personal Read Model — AI-ready projection export over life-read-model.
 * @see docs/AI_READY_PERSONAL_READ_MODEL.md
 */
export {
  assemblePersonalReadPacket,
  clearPersonalReadPacketCacheForTests,
  type AssemblePersonalReadInput,
} from "@/lib/personal-read-model/assemble-personal-read-packet";
export { mapFactSlice } from "@/lib/personal-read-model/map-fact-slice";
export { mapExperienceSlice, resolveActiveHubKinds } from "@/lib/personal-read-model/map-experience-slice";
export { mapMeaningSlice } from "@/lib/personal-read-model/map-meaning-slice";
export { mapRecallSlice } from "@/lib/personal-read-model/map-recall-slice";
export { mapActionSlice } from "@/lib/personal-read-model/map-action-slice";
export { mapGateSlice } from "@/lib/personal-read-model/map-gate-slice";
export { resolveReadScopeAi } from "@/lib/personal-read-model/resolve-read-scope-ai";
export { serializePacketForLlm } from "@/lib/personal-read-model/serialize-packet-for-llm";
export { redactPacketForExplorer } from "@/lib/personal-read-model/redact-packet-for-explorer";
export { buildPersonalReadContextBlock } from "@/lib/personal-read-model/build-personal-read-context-block";
export {
  validateActionContract,
  type ActionContractResponse,
} from "@/lib/personal-read-model/validate-action-contract";
export { validateArchitectWireAgainstPrm } from "@/lib/personal-read-model/validate-architect-wire-against-prm";
export type {
  ContextPacket,
  PersonalReadPacket,
  PersonalReadMeta,
  PersonalReadScope,
  PersonalReadFactSlice,
  PersonalReadExperienceSlice,
  PersonalReadMeaningSlice,
  PersonalReadRecallSlice,
  PersonalReadActionSlice,
  PersonalReadGateSlice,
  MeaningProvenance,
  RecallTriggerKind,
} from "@/lib/personal-read-model/types";

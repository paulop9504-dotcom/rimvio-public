export type {
  UIRenderInstruction,
  UIRenderInstructionType,
  ExplainabilityPanelModel,
  ProofUIRenderModel,
  ProofUIRenderHandlers,
  RenderFromProofContext,
} from "@/lib/event-os/ui-binding/ui-render-types";
export { translateUiDiff } from "@/lib/event-os/ui-binding/translate-ui-diff";
export { buildExplainabilityFromProof } from "@/lib/event-os/ui-binding/build-explainability";
export { renderFromProof } from "@/lib/event-os/ui-binding/render-from-proof";
export { validateProofUiBinding } from "@/lib/event-os/ui-binding/validate-proof-ui-binding";
export { applyUiInstructions } from "@/lib/event-os/ui-binding/apply-ui-instructions";
export { applyProofRenderToClient } from "@/lib/event-os/ui-binding/apply-proof-render-to-client";

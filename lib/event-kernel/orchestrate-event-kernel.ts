import { buildSemanticFrame } from "@/lib/search-intent/build-semantic-frame";
import {
  classifyMicroIntentDistribution,
  turnPressureFromDistribution,
} from "@/lib/event-kernel/classify-micro-intent-distribution";
import {
  buildKernelActions,
  buildKernelResponseHint,
  dominantMicroIntent,
  resolveCommitDecision,
} from "@/lib/event-kernel/commit-gate";
import { computeMicroIntentEntropy } from "@/lib/event-kernel/compute-entropy";
import {
  frameFromSemanticFrame,
  type EventKernelState,
  type OrchestrateEventKernelInput,
} from "@/lib/event-kernel/types";

/** Event Kernel SSOT — see EVENT_KERNEL_SPEC.md. No chat; state + decision only. */
export function orchestrateEventKernel(
  input: OrchestrateEventKernelInput
): EventKernelState {
  const message = input.message.trim();
  const history = input.history ?? [];

  const semanticFrame = buildSemanticFrame({
    text: message,
    context: input.linkTitle?.trim(),
    deeplinkSeed: input.deeplinkSeed,
  });

  const { distribution, signals } = classifyMicroIntentDistribution({
    message,
    history,
  });

  const entropy = computeMicroIntentEntropy(distribution);
  const dominantIntent = dominantMicroIntent(distribution);
  const committedDecision = resolveCommitDecision(entropy);
  const frame = frameFromSemanticFrame(semanticFrame);
  const turnPressure = turnPressureFromDistribution(distribution);

  const actions = buildKernelActions({
    decision: committedDecision,
    dominant: dominantIntent,
    frame,
    distribution,
  });

  const responseHint = buildKernelResponseHint({
    decision: committedDecision,
    dominant: dominantIntent,
    frame,
  });

  return {
    frame,
    microIntentDistribution: distribution,
    entropy,
    committedDecision,
    dominantIntent,
    turnPressure,
    actions,
    responseHint,
    signals,
    history,
  };
}

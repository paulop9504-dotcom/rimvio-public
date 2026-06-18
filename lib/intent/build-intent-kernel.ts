import type { ScreenshotIntent } from "@/lib/screenshot/classify-intent";
import type { ConfidenceState } from "@/lib/screenshot/confidence-state";
import {
  mapScreenshotKindToKernelCategory,
  primaryActionFamilyForKernel,
} from "@/lib/intent/category-map";
import { collectBehaviorSignals } from "@/lib/intent/collect-behavior-signals";
import type {
  BehaviorContext,
  IntentKernelResult,
  InteractionMode,
} from "@/lib/intent/kernel-types";
import { INTENT_KERNEL_VERSION } from "@/lib/intent/kernel-version";
import type { SignalEntry } from "@/lib/screenshot/signal-ledger";

export function buildIntentKernel(input: {
  state: ConfidenceState;
  intent?: ScreenshotIntent | null;
  behavior?: BehaviorContext;
  llmInvoked: boolean;
  llmSource: "llm" | "skipped";
  domain?: string | null;
  category?: string | null;
  title?: string | null;
  now?: number;
}): IntentKernelResult {
  const behavior = collectBehaviorSignals(input.behavior, input.now);
  const mergedSignals: SignalEntry[] = [
    ...input.state.signals,
    ...behavior.signals,
  ];

  const query =
    input.intent?.query?.trim() ||
    input.behavior?.current?.query?.trim() ||
    input.behavior?.current?.title?.trim() ||
    "";

  const kernelCategory = mapScreenshotKindToKernelCategory({
    kind: input.intent?.kind,
    domain: input.domain ?? input.behavior?.current?.domain ?? null,
    category: input.category ?? input.behavior?.current?.category ?? null,
    title: input.title ?? input.behavior?.current?.title ?? null,
    query,
  });

  const interactionMode: InteractionMode =
    input.state.band === "uncertain"
      ? "uncertain"
      : behavior.interaction_mode;

  const primaryActionFamily = primaryActionFamilyForKernel({
    kernelCategory,
    band: input.state.band,
    crossLinkPattern: behavior.cross_link.pattern,
  });

  return {
    v: INTENT_KERNEL_VERSION,
    shadow_intent: {
      category: kernelCategory,
      query,
      confidence: Number((input.state.score / 100).toFixed(3)),
    },
    state: {
      interaction_mode: interactionMode,
      trajectory: behavior.trajectory,
      context_signals: behavior.context_signal_ids,
      cross_link: behavior.cross_link,
    },
    policy: {
      band: input.state.band,
      run_llm: input.state.policy.runLlm,
      needs_confirm: input.state.policy.needsConfirm,
      primary_action_family: primaryActionFamily,
    },
    signals: mergedSignals,
    llm: {
      invoked: input.llmInvoked,
      source: input.llmSource,
    },
  };
}

export function enrichIntentKernelWithBehavior(
  kernel: IntentKernelResult,
  state: ConfidenceState,
  behavior: BehaviorContext,
  now?: number
): IntentKernelResult {
  return buildIntentKernel({
    state,
    behavior,
    llmInvoked: kernel.llm.invoked,
    llmSource: kernel.llm.source,
    intent: kernel.shadow_intent.query
      ? {
          kind:
            kernel.shadow_intent.category === "place"
              ? "place"
              : kernel.shadow_intent.category === "commerce"
                ? "product"
                : "product",
          query: kernel.shadow_intent.query,
          ocrText: kernel.shadow_intent.query,
        }
      : null,
    domain: behavior.current?.domain,
    category: behavior.current?.category,
    title: behavior.current?.title,
    now,
  });
}

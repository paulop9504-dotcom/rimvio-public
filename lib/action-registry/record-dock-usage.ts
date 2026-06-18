import {
  recordTemplateUsage,
  upsertLearningTemplate,
} from "@/lib/action-registry/action-registry-store";
import type { PredictiveDockAction } from "@/lib/predictive-dock/types";

/** Record usage when user taps a dock chip — drives LEARNING → PROMOTED. */
export function recordDockActionUsage(input: {
  action: PredictiveDockAction;
  templateId?: string | null;
  contextKey?: string;
  strategyApplied?: "DYNAMIC_INFERENCE" | "LEARNED_TEMPLATE" | "MANUAL_CORE";
}) {
  if (input.templateId && input.templateId !== "dynamic") {
    recordTemplateUsage(input.templateId);
    return;
  }

  if (input.strategyApplied === "DYNAMIC_INFERENCE" && input.contextKey) {
    upsertLearningTemplate({
      contextKey: input.contextKey,
      category: "Generic",
      scenario: "dynamic_dock",
      main_action: {
        type: input.action.type,
        label: input.action.label,
        prompt: input.action.prompt,
        priority: input.action.score,
      },
      shadow_actions: [],
    });
  }
}

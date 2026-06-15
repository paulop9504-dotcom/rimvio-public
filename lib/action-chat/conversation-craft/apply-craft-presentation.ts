import {
  mergeOrchestratorMetadata,
  type OrchestratorResult,
} from "@/lib/action-chat/orchestrator-types";
import type { AdaptiveBehaviorContext } from "@/lib/action-chat/adaptive-behavior/types";
import type { ConversationCraftFlags } from "@/lib/action-chat/conversation-craft/types";

export function craftMetadataFields(
  craft: ConversationCraftFlags | undefined,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  if (!craft?.techniques.length) {
    return { ...extra, conversation_craft: "v1" };
  }
  return {
    ...extra,
    conversation_craft: "v1",
    craft_techniques: craft.techniques,
    craft_context_icons: craft.contextIcons.length ? craft.contextIcons : undefined,
    craft_mad_libs: craft.madLibs ?? undefined,
    craft_polar_slider: craft.polarSlider ?? undefined,
    craft_vitality_react: craft.vitalityReact ?? undefined,
    craft_preference_fingerprint: craft.preferenceFingerprint ?? undefined,
    craft_schedule_anchor: craft.scheduleAnchor ?? undefined,
    suppress_chips: craft.techniques.includes("vitality_quick_react") ? true : extra?.suppress_chips,
  };
}

export function applyCraftPresentation(
  result: OrchestratorResult,
  adaptive: AdaptiveBehaviorContext
): OrchestratorResult {
  const craft = adaptive.craft;
  if (!craft?.techniques.length) {
    return result;
  }

  const suppressChips =
    craft.techniques.includes("vitality_quick_react") ||
    craft.techniques.includes("zero_step") ||
    Boolean((result.metadata as { suppress_chips?: boolean } | undefined)?.suppress_chips);

  return {
    ...result,
    metadata: mergeOrchestratorMetadata(result.metadata, {
      ...craftMetadataFields(craft, {
        ...(result.metadata as Record<string, unknown> | undefined),
        suppress_chips: suppressChips,
      }),
    }),
  };
}

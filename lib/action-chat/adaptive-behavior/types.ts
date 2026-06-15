import type { AbstractionLevel } from "@/lib/action-chat/classify-abstraction-level";
import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import type { VitalityStateKind } from "@/lib/vitality-state/vitality-state-types";
import type { UxGuardFlags } from "@/lib/action-chat/adaptive-behavior/ux-guards/types";
import type { VitalityMemoryWire } from "@/lib/action-chat/adaptive-behavior/ux-guards/vitality-state-decay";
import type { ConversationCraftFlags } from "@/lib/action-chat/conversation-craft/types";

export type HiddenIntentKind =
  | "boredom"
  | "anxiety"
  | "fatigue"
  | "avoidance"
  | "curiosity";

export type AdaptiveRoutingHint =
  | "FOOD"
  | "DECISION"
  | "COUNSELING"
  | "SCHEDULE"
  | "FOOD_DECISION_MIX"
  | "SCHEDULE_RELIEF";

export type AdaptiveBehaviorContext = {
  abstractionLevel: AbstractionLevel;
  hiddenIntents: HiddenIntentKind[];
  vitalityStates: VitalityStateKind[];
  autoDecide: boolean;
  decisionFatigue: boolean;
  simplifyMode: boolean;
  routingHint: AdaptiveRoutingHint | null;
  /** Preempt Tiki A/B/C with single recommendation. */
  shouldPreemptTiki: boolean;
  /** Message after mid-thought pivot strip. */
  effectiveMessage: string;
  ux: UxGuardFlags;
  craft: ConversationCraftFlags;
};

export type AdaptiveBehaviorInput = {
  message: string;
  history?: readonly { role: "user" | "assistant"; content: string }[];
  chatAxis?: ChatAxis;
  vitalityMemory?: VitalityMemoryWire | null;
  referenceDate?: string;
  existingSchedule?: readonly { time?: string; task?: string; title?: string }[];
};

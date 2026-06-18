export type MorningProviderId =
  | "weather"
  | "health"
  | "finance"
  | "shadow_inbox"
  | "habits"
  | "device";

export type MorningToneMode = "partner" | "jarvis";

export type MorningSignalStrength = "low" | "medium" | "high";

export type MorningProviderSnapshot = {
  id: MorningProviderId;
  label: string;
  summary: string;
  detail?: string;
  strength: MorningSignalStrength;
  metrics?: Record<string, string | number | boolean | null>;
  suggested_action?: string;
};

export type MorningContextBundle = {
  resolved_at: string;
  tone: MorningToneMode;
  location_label: string;
  providers: MorningProviderSnapshot[];
};

export type MorningPriorityAction = {
  category: string;
  content: string;
  action_label: string;
  action_type?: string;
};

export type MorningDailyInsight = {
  summary: string;
  reason: string;
};

export type MorningBriefingWire = {
  tone: MorningToneMode;
  greeting: string;
  daily_insight: MorningDailyInsight;
  priority_actions: MorningPriorityAction[];
  encouragement: string;
  /** Top 3 provider ids selected by rule pre-filter (debug/telemetry) */
  selected_providers: MorningProviderId[];
};

export type MorningOrchestrateInput = {
  message: string;
  referenceDate?: string;
  location?: string;
  tone?: MorningToneMode;
  hour?: number;
  existingSchedule?: import("@/lib/schedule/day-schedule").ExistingScheduleInput;
};

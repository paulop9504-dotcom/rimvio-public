export type TimeExpressionKind = "relative" | "absolute" | "none";

export type TimeExpressionAnalysis = {
  kind: TimeExpressionKind;
  raw?: string;
};

export type ParsedAbsoluteTime = {
  iso: string;
  clockLabel: string;
  isPastToday: boolean;
  dateKey: string;
};

export type TimeChoiceOption = {
  label: string;
  prompt: string;
  mode: "calendar" | "countdown" | "both" | "today" | "tomorrow";
};

export type TimeChoiceWire = {
  action: "ASK_TIME_CHOICE";
  /** Time slot is resolved — place may still be missing */
  time_locked: boolean;
  datetime_iso: string;
  task_label: string;
  headline: string;
  empathy_line: string;
  missing_place_note?: string;
  options: TimeChoiceOption[];
};

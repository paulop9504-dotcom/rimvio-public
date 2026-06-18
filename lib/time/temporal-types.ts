export type TemporalResolution = {
  /** YYYY-MM-DD */
  dateKey: string;
  /** ISO local datetime for tools */
  iso: string;
  /** Korean display — 24h, no AM/PM conversion */
  displayLabel: string;
  rawPhrase: string;
  hasClockTime: boolean;
  intent: "schedule_calculation";
  /** Set when resolution used minute/hour offset from `now`. */
  offsetMinutes?: number;
};

export type TemporalPatternMatch = {
  rawPhrase: string;
  patternKind:
    | "offset_minutes"
    | "offset_hours"
    | "offset_days"
    | "offset_weeks"
    | "offset_months"
    | "offset_years"
    | "next_week"
    | "next_month"
    | "next_year"
    | "named_day";
};

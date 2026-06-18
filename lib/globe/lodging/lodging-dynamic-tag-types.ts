export type LodgingContextMode =
  | "business_trip"
  | "theme_park_day"
  | "outdoor_long_day"
  | "leisure_travel";

export type LodgingDynamicChip = {
  id: string;
  label: string;
};

export type LodgingDynamicTags = {
  chips: readonly LodgingDynamicChip[];
  contextLine: string | null;
};

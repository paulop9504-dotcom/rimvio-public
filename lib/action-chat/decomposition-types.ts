export type DecomposedIntent =
  | "SHOPPING"
  | "RESERVATION"
  | "TASK"
  | "NAVIGATION"
  | "SCHEDULE"
  | "FINANCE"
  | "MOBILITY"
  | "COMMUNICATION"
  | "MEDIA";

export type DecomposedTask = {
  intent: DecomposedIntent;
  place: string | null;
  details: string;
  raw_snippet: string;
  datetime: string | null;
};

export type DecompositionWire = {
  tasks: DecomposedTask[];
};

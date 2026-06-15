export type ActionProjectionPhase = "T-24h" | "T-departure" | "T-2h" | "AT_EVENT";

export type ProjectedEventAction = {
  id: string;
  label: string;
  phase: ActionProjectionPhase;
};

export type ActionProjectionEntry = {
  ecId: string;
  title: string;
  startAt: string;
  actions: ProjectedEventAction[];
};

export type ActionProjectionResult = {
  computedAt: string;
  entries: ActionProjectionEntry[];
};

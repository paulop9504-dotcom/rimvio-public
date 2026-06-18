/** Context Gardener — projection on Creation Context (EventCandidate). Not a parallel SSOT. */
export const CONTEXT_GARDEN_META_KEY = "contextGarden";

export type ContextResourceGardenStatus = "active" | "done" | "expired";

export type ContextResourceGardenState = {
  status: ContextResourceGardenStatus;
  updatedAtIso: string;
};

export type ContextGardenSubGroup = {
  groupId: string;
  labelKo: string;
  resourceIds: readonly string[];
  windowStartIso: string | null;
  windowEndIso: string | null;
};

export type ContextGardenSummary = {
  headlineKo: string;
  linesKo: readonly string[];
};

/** Deterministic garden snapshot — stamped on EventCandidate.metadata. */
export type ContextGardenSnapshot = {
  updatedAtIso: string;
  summary: ContextGardenSummary;
  subGroups: readonly ContextGardenSubGroup[];
  hotResourceId: string | null;
  coldResourceIds: readonly string[];
  archivedResourceIds: readonly string[];
  resourceStates: Record<string, ContextResourceGardenState>;
};

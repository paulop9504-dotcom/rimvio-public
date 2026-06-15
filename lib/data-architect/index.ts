export type { DataArchitectWire, DataArchitectAction } from "@/lib/data-architect/types";
export { ingestData } from "@/lib/data-architect/ingest-data";
export { orchestrateDataArchitect, isDataArchitectCandidate } from "@/lib/data-architect/orchestrate-data-architect";
export { ARCHITECT_ACTION_OPTIONS } from "@/lib/data-architect/ingest-decision-options";
export { autoFileLink, autoFileLinksIfNeeded, classifyLink } from "@/lib/data-architect/auto-classify-link";
export { executeIngestDecision, formatArchitectSummary } from "@/lib/data-architect/persist-architect-assignment";

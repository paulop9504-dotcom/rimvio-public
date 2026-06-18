/**
 * Life read facade — UI and display layers must use only these entry points.
 * @see scripts/test-life-read-store-allowlist.ts
 */
export { readLifeProjections } from "@/lib/life-read-model/read-life-projections";
export { readSurface } from "@/lib/life-read-model/read-surface";
export {
  EVENT_CANDIDATES_UPDATED,
  subscribeLifeCandidatesUpdated,
} from "@/lib/life-read-model/candidates-updated";
export {
  findLifeEventCandidate,
  listLifeEventCandidates,
} from "@/lib/life-read-model/internal/event-store-read";
export type {
  LifeProjections,
  LifeProjectionsInput,
  SurfaceReadBundle,
  SurfaceReadInput,
} from "@/lib/life-read-model/types";

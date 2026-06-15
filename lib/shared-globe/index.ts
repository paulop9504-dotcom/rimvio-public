export {
  SHARED_GLOBE_META_KEYS,
  SHARED_GLOBE_MIN_JOINT_VERIFIERS,
  SHARED_GLOBE_MIN_MEMBERS,
  type SharedGlobe,
  type SharedGlobeFoundationPin,
  type SharedGlobeLayer,
  type SharedGlobeMember,
  type SharedGlobeMemberRole,
  type SharedGlobePinAuthor,
} from "@/lib/shared-globe/shared-globe-types";

export {
  readSharedGlobeIdFromMetadata,
  resolveSharedGlobeId,
} from "@/lib/shared-globe/shared-globe-id";

export { mapLegacyPinToFoundationPin } from "@/lib/shared-globe/map-legacy-globe-pin";

export {
  evaluateSharedGlobeAutoCreate,
  type SharedGlobeAutoCreateSignals,
} from "@/lib/shared-globe/evaluate-shared-globe-auto-create";

export { projectSharedGlobe } from "@/lib/shared-globe/project-shared-globe";

export {
  createEmptySharedGlobe,
  tryAutoCreateSharedGlobe,
  type CreateSharedGlobeResult,
} from "@/lib/shared-globe/create-empty-shared-globe";

export { inviteSharedGlobeMember } from "@/lib/shared-globe/invite-shared-globe-member";

export {
  applyLegacySharedGlobePin,
  applySharedGlobePin,
  buildSharedGlobeFoundationPin,
  type PlaceSharedGlobePinInput,
} from "@/lib/shared-globe/place-shared-globe-pin";

export { buildSharedGlobeLayer } from "@/lib/shared-globe/build-shared-globe-layer";

export {
  resolveSharedGlobeProjection,
  resolveSharedGlobeWithAutoCreate,
  type SharedGlobeProjection,
} from "@/lib/shared-globe/resolve-shared-globe-projection";

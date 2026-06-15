/** Personal experience visibility — external share is Phase 2. */
export const GLOBE_CONTEXT_VISIBILITY_PRIVATE = "private" as const;
export const GLOBE_CONTEXT_VISIBILITY_EXTERNAL = "external" as const;

export type GlobeContextVisibility =
  | typeof GLOBE_CONTEXT_VISIBILITY_PRIVATE
  | typeof GLOBE_CONTEXT_VISIBILITY_EXTERNAL;

export function defaultGlobeContextVisibilityMetadata(): {
  globeContextVisibility: GlobeContextVisibility;
} {
  return { globeContextVisibility: GLOBE_CONTEXT_VISIBILITY_PRIVATE };
}

/** View-only hub opener on globe — opens Hub detail, not pin info sheet. */
export type GlobeContextHubMapAnchor = {
  markerKind: "context_hub";
  id: string;
  contextEventId: string;
  label: string;
  shortLabel: string;
  lat: number;
  lng: number;
  connectedCount: number;
};

export function isGlobeContextHubMapAnchor(
  value: unknown,
): value is GlobeContextHubMapAnchor {
  return (
    !!value &&
    typeof value === "object" &&
    (value as GlobeContextHubMapAnchor).markerKind === "context_hub"
  );
}

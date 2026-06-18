/** Coordinate fallback labels from formatCoordsPlaceLabel — not a venue name. */
export function isCoordsPlaceLabel(label: string | null | undefined): boolean {
  return Boolean(label?.includes("°"));
}

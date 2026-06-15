export function normalizePeerDisplayName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Full label + text before parenthetical alias, e.g. "황정성 (Kind정성)" → both needles. */
export function peerDisplayNameNeedles(value: string): string[] {
  const full = normalizePeerDisplayName(value);
  const primary = normalizePeerDisplayName(
    value.replace(/\s*\([^)]*\)\s*/gu, " "),
  );
  const needles = [full, primary].filter((part) => part.length > 0);
  return [...new Set(needles)];
}

export function peerDisplayNamesMatch(
  profileLabel: string,
  queryLabel: string,
): boolean {
  const profileNeedles = peerDisplayNameNeedles(profileLabel);
  const queryNeedles = peerDisplayNameNeedles(queryLabel);
  return queryNeedles.some((query) =>
    profileNeedles.some(
      (profile) =>
        profile === query || profile.includes(query) || query.includes(profile),
    ),
  );
}

export type GlobeContextTimeFilter = "all" | "this_year" | "this_month";

export function resolveGlobeContextTimeFilterLabel(
  filter: GlobeContextTimeFilter,
): string {
  if (filter === "this_year") {
    return "올해";
  }
  if (filter === "this_month") {
    return "이번 달";
  }
  return "전체";
}

export function matchesGlobeContextTimeFilter(
  startedAtIso: string | null | undefined,
  filter: GlobeContextTimeFilter,
  now = new Date(),
): boolean {
  if (filter === "all") {
    return true;
  }
  if (!startedAtIso?.trim()) {
    return filter === "all";
  }
  const ms = Date.parse(startedAtIso);
  if (Number.isNaN(ms)) {
    return true;
  }
  const date = new Date(ms);
  if (filter === "this_year") {
    return date.getFullYear() === now.getFullYear();
  }
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

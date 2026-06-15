import type { LifeZoneInference, SearchActivityEntry } from "@/lib/location-memory/types";

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso.slice(0, 10);
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** Stage 2 — infer primary life zone from recent search activity. */
export function inferLifeZoneFromActivities(
  activities: SearchActivityEntry[]
): LifeZoneInference | null {
  const withRegion = activities.filter((entry) => entry.region_label?.trim());
  if (withRegion.length < 2) {
    return null;
  }

  const counts = new Map<string, number>();
  for (const entry of withRegion) {
    const label = entry.region_label!.trim();
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [topLabel, topCount] = ranked[0]!;
  const confidence = Math.min(0.95, 0.45 + topCount / withRegion.length);

  if (topCount < 2) {
    return null;
  }

  const evidence = withRegion
    .filter((entry) => entry.region_label === topLabel)
    .slice(0, 4)
    .map((entry) => ({
      date_label: formatDateLabel(entry.createdAt),
      query: entry.query,
    }));

  const transparent_line = `평소 ${topLabel} 근처를 자주 검색하셔서, 그곳을 출발지 후보로 두고 경로를 확인해 볼게요.`;

  return {
    label: topLabel,
    confidence,
    evidence,
    transparent_line,
  };
}

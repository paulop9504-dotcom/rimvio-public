import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextHubServiceRow } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { parseIsoMs } from "@/lib/feed/spacetime-fit";
import type { ContextGardenSummary } from "@/lib/globe/context-gardener/types";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

function formatRelativeHotLine(
  hot: RankedContextResource | null,
  nowMs: number,
): string | null {
  if (!hot) {
    return null;
  }
  const startMs = parseIsoMs(hot.resource.spacetime.validFromIso ?? null);
  if (startMs === null) {
    return `지금 · ${hot.resource.label}`;
  }
  const deltaMs = startMs - nowMs;
  if (deltaMs <= 0) {
    return `지금 · ${hot.resource.label}`;
  }
  const hours = Math.round(deltaMs / (60 * 60 * 1000));
  if (hours < 24) {
    return `${hours}시간 후 · ${hot.resource.label}`;
  }
  const days = Math.round(hours / 24);
  return `${days}일 후 · ${hot.resource.label}`;
}

function countConnected(services: readonly ContextHubServiceRow[]): string[] {
  const parts: string[] = [];
  for (const row of services) {
    if (!row.connected) {
      continue;
    }
    switch (row.serviceId) {
      case "flight":
        parts.push("항공 연결됨");
        break;
      case "lodging":
        parts.push("숙소 연결됨");
        break;
      case "ticket":
        parts.push("티켓 준비됨");
        break;
      default:
        break;
    }
  }
  return parts;
}

/** Deterministic summary card — LLM optional later; template first. */
export function buildGardenSummary(input: {
  event: EventCandidate;
  services: readonly ContextHubServiceRow[];
  activeRanked: readonly RankedContextResource[];
  hot: RankedContextResource | null;
  subGroupCount: number;
  now?: Date;
}): ContextGardenSummary {
  const plan = readPlanContextFromEvent(input.event);
  const place =
    plan?.place?.trim() ||
    input.event.place?.trim() ||
    input.event.title.trim() ||
    "맥락";
  const headlineKo = `${place} · 지금 상태`;

  const lines: string[] = countConnected(input.services);
  const lodgingCount = input.activeRanked.filter(
    (entry) => entry.resource.kind === "lodging_voucher",
  ).length;
  if (lodgingCount > 1) {
    const lodgingIndex = lines.findIndex((line) => line.startsWith("숙소"));
    if (lodgingIndex >= 0) {
      lines[lodgingIndex] = `숙소 ${lodgingCount}곳`;
    }
  }

  if (input.subGroupCount > 1) {
    lines.push(`묶음 ${input.subGroupCount}개`);
  }

  const hotLine = formatRelativeHotLine(
    input.hot,
    (input.now ?? new Date()).getTime(),
  );
  if (hotLine) {
    lines.push(hotLine);
  }

  return {
    headlineKo,
    linesKo: lines.slice(0, 4),
  };
}

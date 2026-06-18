import { listLearningRollup } from "@/lib/archive/learning-rollup-store";
import { projectRelationshipMeaningLine } from "@/lib/copy/project-relationship-meaning-line";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildMeaningGraph, topMeaningEdges } from "@/lib/meaning";
import { collectEventPeople } from "@/lib/people-graph/collect-event-people";
import type { PersonalReadMeaningSlice } from "@/lib/personal-read-model/types";

const TOP_EDGE_LIMIT = 5;
const ROLLUP_AFFINITY_LIMIT = 8;
const RELATIONSHIP_PEER_LIMIT = 3;

function deriveSeasonPattern(
  events: readonly EventCandidate[],
  now: Date,
): PersonalReadMeaningSlice["seasonPattern"] {
  const month = now.getMonth() + 1;
  const travelCount = events.filter((row) => row.category === "travel").length;
  const upcomingTravel = events.filter((row) => {
    if (row.category !== "travel") {
      return false;
    }
    const ms = Date.parse(row.datetime ?? row.updatedAt ?? "");
    return !Number.isNaN(ms) && ms >= now.getTime() && ms <= now.getTime() + 60 * 86400000;
  }).length;

  if (upcomingTravel >= 1) {
    return {
      key: "vacation_prep",
      label: "휴가·여행 준비 단계",
      confidence: Math.min(0.95, 0.55 + upcomingTravel * 0.15),
    };
  }

  if (travelCount >= 2 && (month >= 6 && month <= 8)) {
    return {
      key: "summer_travel",
      label: "여름 여행 시즌",
      confidence: 0.6,
    };
  }

  if (events.length >= 8) {
    return {
      key: "active_life_phase",
      label: "활동이 많은 시기",
      confidence: 0.45,
    };
  }

  return null;
}

function collectTopPeerLabels(events: readonly EventCandidate[]): string[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    for (const peer of collectEventPeople(event)) {
      counts.set(peer, (counts.get(peer) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, RELATIONSHIP_PEER_LIMIT)
    .map(([label]) => label);
}

export function mapMeaningSlice(input: {
  events: readonly EventCandidate[];
  now: Date;
  contextFilter?: string | null;
}): PersonalReadMeaningSlice {
  const graph = buildMeaningGraph(input.events, input.now);
  const topEdges = topMeaningEdges(graph, { limit: TOP_EDGE_LIMIT }).map((edge) => ({
    edgeId: edge.id,
    meaningLabel: edge.meaningLabel,
    totalScore: edge.score.total,
    eventIds: edge.eventIds,
    provenance: "behavior" as const,
  }));

  const relationshipLines = collectTopPeerLabels(input.events)
    .map((peerLabel) => {
      const projection = projectRelationshipMeaningLine({
        displayName: peerLabel,
        events: input.events,
        now: input.now,
      });
      if (!projection) {
        return null;
      }
      return {
        peerLabel,
        line: projection.line,
        confidence: projection.confidence,
        frame: projection.frame,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  const filterHay = input.contextFilter?.trim().toLowerCase() ?? "";
  const rollupAffinities = listLearningRollup()
    .filter((entry) => {
      if (!filterHay) {
        return true;
      }
      return entry.contextKey.toLowerCase().includes(filterHay);
    })
    .sort((a, b) => b.scoreDelta - a.scoreDelta)
    .slice(0, ROLLUP_AFFINITY_LIMIT)
    .map((entry) => ({
      contextKey: entry.contextKey,
      actionKey: entry.actionKey,
      weight: entry.scoreDelta,
      shown: entry.shown,
      executed: entry.executed,
    }));

  return {
    topEdges,
    relationshipLines,
    seasonPattern: deriveSeasonPattern(input.events, input.now),
    rollupAffinities,
  };
}

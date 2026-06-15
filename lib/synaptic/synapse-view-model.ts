import { getCapability } from "@/lib/capability-registry/capability-registry";
import type { CapabilityId } from "@/lib/capability-registry/capability-types";
import type { SynapseEdge } from "@/lib/synaptic/synapse-contract";
import { readSynapseSnapshot } from "@/lib/synaptic/synapse-store";

export type SynapticHabitRow = {
  id: string;
  surfaceId: string;
  capabilityId: CapabilityId;
  label: string;
  weight: number;
  salience: number;
  strengthPercent: number;
};

const CAPABILITY_KO: Partial<Record<CapabilityId, string>> = {
  BOOK_FLIGHT: "항공권",
  BOOK_HOTEL: "숙소",
  CHECK_IN: "체크인",
  NAVIGATE: "길찾기",
  ALARM: "알림",
  CALENDAR: "일정",
  CONFIRM_PLACE: "장소 확인",
  MESSAGE: "메시지",
  CALL: "연락",
  SEARCH: "검색",
  CLARIFY_GOAL: "목표 정리",
  DISMISS_SURFACE: "나중에",
};

function labelForCapability(capabilityId: CapabilityId): string {
  const cap = getCapability(capabilityId);
  if (cap?.name?.trim()) {
    return cap.name.trim();
  }
  return CAPABILITY_KO[capabilityId] ?? capabilityId;
}

function strengthPercent(weight: number): number {
  return Math.round(((weight + 1) / 2) * 100);
}

/** UI-facing habit list — strongest reinforced paths first. */
export function deriveSynapticHabits(options?: {
  minWeight?: number;
  limit?: number;
  edges?: readonly SynapseEdge[];
}): SynapticHabitRow[] {
  const minWeight = options?.minWeight ?? 0.12;
  const limit = options?.limit ?? 3;
  const edges = options?.edges ?? readSynapseSnapshot().edges;

  return [...edges]
    .filter((row) => row.weight >= minWeight)
    .sort((a, b) => b.weight * b.salience - a.weight * a.salience)
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      surfaceId: row.surfaceId,
      capabilityId: row.capabilityId,
      label: labelForCapability(row.capabilityId),
      weight: row.weight,
      salience: row.salience,
      strengthPercent: strengthPercent(row.weight),
    }));
}

export function readSynapticSnapshotSummary() {
  const snapshot = readSynapseSnapshot();
  const habits = deriveSynapticHabits({ edges: snapshot.edges });
  return {
    edgeCount: snapshot.edges.length,
    strongHabitCount: habits.length,
    habits,
    updatedAt: snapshot.updatedAt,
  };
}

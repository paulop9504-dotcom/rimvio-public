import type { VitalityStateKind } from "@/lib/vitality-state/vitality-state-types";
import { isVitalityStateKind } from "@/lib/vitality-state/vitality-state-registry";

export type VitalityMemoryWire = {
  states: VitalityStateKind[];
  recordedAt: string;
};

export function parseVitalityMemoryWire(
  raw: { states?: string[]; recordedAt?: string } | null | undefined,
): VitalityMemoryWire | null {
  if (!raw?.states?.length || !raw.recordedAt?.trim()) {
    return null;
  }
  const states = raw.states.filter(isVitalityStateKind);
  if (!states.length) {
    return null;
  }
  return { states, recordedAt: raw.recordedAt };
}

export const VITALITY_DECAY_TTL_MS = 2 * 60 * 60 * 1000;

export function applyVitalityDecay(
  memory: VitalityMemoryWire | null | undefined,
  nowMs = Date.now()
): VitalityStateKind[] {
  if (!memory?.states?.length || !memory.recordedAt) {
    return [];
  }
  const age = nowMs - new Date(memory.recordedAt).getTime();
  if (!Number.isFinite(age) || age > VITALITY_DECAY_TTL_MS) {
    return [];
  }
  return memory.states;
}

export function mergeVitalitySignals(
  current: VitalityStateKind[],
  decayed: VitalityStateKind[]
): VitalityStateKind[] {
  return [...new Set([...current, ...decayed])].filter((kind) =>
    current.includes(kind) ? true : decayed.includes(kind)
  );
}

/** Stale carry-over: decayed states apply only if current message still hints them. */
export function resolveEffectiveVitalityStates(input: {
  current: VitalityStateKind[];
  memory: VitalityMemoryWire | null | undefined;
  message: string;
}): VitalityStateKind[] {
  const decayed = applyVitalityDecay(input.memory);
  const merged = new Set(input.current);

  for (const kind of decayed) {
    if (merged.has(kind)) {
      continue;
    }
    if (vitalityStillRelevant(kind, input.message)) {
      merged.add(kind);
    }
  }

  return [...merged];
}

function vitalityStillRelevant(kind: VitalityStateKind, message: string): boolean {
  switch (kind) {
    case "hunger":
      return /(?:배고|먹|맛집|식사)/iu.test(message);
    case "sleepiness":
      return /(?:졸려|잠)/iu.test(message);
    case "energy_depletion":
      return /(?:피곤|지쳤)/iu.test(message);
    case "overload":
      return /(?:스트레스|복잡|머리)/iu.test(message);
    case "anxiety":
      return /(?:불안|걱정)/iu.test(message);
    default:
      return false;
  }
}

export function buildVitalityMemoryFromStates(
  states: VitalityStateKind[]
): VitalityMemoryWire | null {
  if (!states.length) {
    return null;
  }
  return {
    states,
    recordedAt: new Date().toISOString(),
  };
}

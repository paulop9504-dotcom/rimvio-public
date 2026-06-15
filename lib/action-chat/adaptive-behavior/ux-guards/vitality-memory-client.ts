import type { VitalityMemoryWire } from "@/lib/action-chat/adaptive-behavior/ux-guards/vitality-state-decay";
import type { VitalityStateKind } from "@/lib/vitality-state/vitality-state-types";

export const VITALITY_MEMORY_STORAGE_KEY = "rimvio.vitality.memory.v1";

export function readVitalityMemory(): VitalityMemoryWire | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(VITALITY_MEMORY_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as VitalityMemoryWire;
  } catch {
    return null;
  }
}

export function writeVitalityMemory(states: VitalityStateKind[]): void {
  if (typeof window === "undefined" || !states.length) {
    return;
  }
  try {
    const payload: VitalityMemoryWire = {
      states,
      recordedAt: new Date().toISOString(),
    };
    window.sessionStorage.setItem(VITALITY_MEMORY_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

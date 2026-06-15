import type { Copy } from "@/lib/i18n/types";
import {
  linkAlignsWithRoomPhase,
  resolveDominantRoomPhase,
  type RoomPhaseMode,
  type RoomPhaseState,
} from "@/lib/rooms/room-phase";

export function resolveRoomPhaseHint(
  phase: RoomPhaseState | null | undefined,
  linkCategory: string | null | undefined,
  copy: Copy
): string | null {
  const dominant = resolveDominantRoomPhase(phase);

  if (!dominant) {
    return null;
  }

  if (!linkAlignsWithRoomPhase({ category: linkCategory ?? null }, dominant.mode)) {
    return null;
  }

  const hints: Record<RoomPhaseMode, string> = {
    map: copy.room.phaseMap,
    commerce: copy.room.phaseCommerce,
    travel: copy.room.phaseTravel,
    media: copy.room.phaseMedia,
    social: copy.room.phaseSocial,
    research: copy.room.phaseResearch,
  };

  return hints[dominant.mode] ?? null;
}

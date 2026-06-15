import {
  analyzeIntentSlots,
  formatIntentSlotAnalysisBlock,
} from "@/lib/location-intelligence/analyze-intent-slots";
import { formatLifeZoneContextBlock } from "@/lib/location-memory/format-life-zone-context";
import type { LocationMemoryWire } from "@/lib/location-memory/types";

export async function composeLocationIntelligenceContext(input: {
  message: string;
  referenceDate: string;
  locationMemory?: LocationMemoryWire | null;
  jitContextBlock?: string | null;
}): Promise<string | null> {
  const slotAnalysis = analyzeIntentSlots({
    message: input.message,
    referenceDate: input.referenceDate,
  });

  const slotBlock =
    slotAnalysis.intent !== "unknown" || slotAnalysis.missing_slots.length > 0
      ? formatIntentSlotAnalysisBlock(slotAnalysis)
      : null;

  const useLifeZone =
    Boolean(input.locationMemory?.lifeZone) &&
    (slotAnalysis.intent === "navigate" ||
      slotAnalysis.missing_slots.includes("origin") ||
      /역|길찾|가\s*줘|이동|출발/u.test(input.message));

  const blocks = [
    slotBlock,
    formatLifeZoneContextBlock(useLifeZone ? input.locationMemory : null),
    input.jitContextBlock?.trim() || null,
  ].filter(Boolean);

  if (blocks.length === 0) {
    return null;
  }

  return blocks.join("\n\n");
}

export { analyzeIntentSlots };

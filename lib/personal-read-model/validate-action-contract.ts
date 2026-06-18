import type { PersonalReadPacket } from "@/lib/personal-read-model/types";

export type ActionContractResponse = {
  templateId: string | null;
  filledSlots: Record<string, string>;
  mainActionType: string | null;
} | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validate LLM JSON against registry entries in the packet. Violations → null. */
export function validateActionContract(
  raw: unknown,
  packet: PersonalReadPacket,
): ActionContractResponse {
  if (raw == null) {
    return null;
  }

  if (!isRecord(raw)) {
    return null;
  }

  const templateId =
    typeof raw.templateId === "string" ? raw.templateId.trim() : null;
  const mainActionType =
    typeof raw.mainActionType === "string" ? raw.mainActionType.trim() : null;

  if (!templateId && !mainActionType) {
    return null;
  }

  const entry = templateId
    ? packet.action.registryEntries.find((row) => row.id === templateId) ?? null
    : packet.action.registryEntries.find((row) => row.mainActionType === mainActionType) ?? null;

  if (!entry) {
    return null;
  }

  const filledSlots: Record<string, string> = {};
  const rawSlots = raw.filledSlots;
  if (rawSlots != null) {
    if (!isRecord(rawSlots)) {
      return null;
    }
    for (const [key, value] of Object.entries(rawSlots)) {
      if (typeof value !== "string") {
        return null;
      }
      if (entry.slotNames.length > 0 && !entry.slotNames.includes(key)) {
        return null;
      }
      filledSlots[key] = value.trim();
    }
  }

  if (mainActionType && entry.mainActionType && mainActionType !== entry.mainActionType) {
    return null;
  }

  if (packet.gates.forbidRecommendationHero) {
    const hay = `${templateId ?? ""} ${mainActionType ?? ""}`.toLowerCase();
    if (hay.includes("recommend") || hay.includes("discovery")) {
      return null;
    }
  }

  return {
    templateId: entry.id,
    filledSlots,
    mainActionType: entry.mainActionType,
  };
}

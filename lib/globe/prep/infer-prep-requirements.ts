import type { ExecutionProfileId } from "@/lib/globe/passive-context/types";
import type { PrepRequirementDef } from "@/lib/globe/prep/prep-types";

const THEME_PARK_REQUIREMENTS: readonly PrepRequirementDef[] = [
  { id: "power_bank", labelKo: "보조배터리 (충전했어?)" },
  { id: "comfortable_shoes", labelKo: "편한 신발 (많이 걸을 거야)" },
  { id: "sun_protection", labelKo: "선글라스 · 선크림 (햇빛 강함)" },
  { id: "ticket_qr", labelKo: "티켓 · QR (바로 보여줄 수 있게)" },
];

const OUTDOOR_LONG_REQUIREMENTS: readonly PrepRequirementDef[] = [
  { id: "water", labelKo: "물 · 이온음료" },
  { id: "comfortable_shoes", labelKo: "편한 신발" },
  { id: "sun_protection", labelKo: "모자 · 선크림" },
  { id: "power_bank", labelKo: "보조배터리" },
];

/** Deterministic requirement inference — LLM optional later. */
export function inferPrepRequirements(
  profileId: ExecutionProfileId,
): readonly PrepRequirementDef[] {
  switch (profileId) {
    case "theme_park_day":
      return THEME_PARK_REQUIREMENTS;
    case "outdoor_long_day":
      return OUTDOOR_LONG_REQUIREMENTS;
    default:
      return [];
  }
}

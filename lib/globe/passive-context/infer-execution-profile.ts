import type { ExecutionProfileId } from "@/lib/globe/passive-context/types";

const THEME_PARK_PATTERN =
  /디즈니|disney|유니버설|universal|에버랜드|롯데월드|테마파크|놀이공원|오션파크|legoland|세계박람회/u;

const OUTDOOR_LONG_PATTERN =
  /등산|트레킹|hiking|국립공원|해안|해변|beach|캠핑|camp|마라톤|festival|축제/u;

/** Infer prep profile from place/title text — rule catalog first. */
export function inferExecutionProfileFromText(
  raw: string | null | undefined,
): ExecutionProfileId | null {
  const hay = raw?.trim();
  if (!hay) {
    return null;
  }
  if (THEME_PARK_PATTERN.test(hay)) {
    return "theme_park_day";
  }
  if (OUTDOOR_LONG_PATTERN.test(hay)) {
    return "outdoor_long_day";
  }
  return null;
}

export function readExecutionProfileId(
  metadata: Record<string, unknown> | null | undefined,
): ExecutionProfileId | null {
  const raw = metadata?.executionProfileId;
  if (raw === "theme_park_day" || raw === "outdoor_long_day") {
    return raw;
  }
  return null;
}

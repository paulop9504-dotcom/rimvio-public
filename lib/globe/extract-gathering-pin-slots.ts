/** P3 — gathering slot extraction (deterministic, no form). */

const HEADCOUNT_SIGNAL = /(\d{1,3})\s*명/u;
const TIME_SIGNAL =
  /(?:(\d{1,2})\s*시|오늘|내일|모레|주말|토요일|일요일|월요일|화요일|수요일|목요일|금요일)/u;

export type GatheringPinSlots = {
  summary: string;
  headcountHint?: number;
  timeHint?: string;
};

export function extractGatheringPinSlots(text: string): GatheringPinSlots {
  const trimmed = text.trim();
  if (!trimmed) {
    return { summary: "" };
  }

  const headcountMatch = trimmed.match(HEADCOUNT_SIGNAL);
  const timeMatch = trimmed.match(TIME_SIGNAL);

  return {
    summary: trimmed.slice(0, 160),
    ...(headcountMatch
      ? { headcountHint: Number.parseInt(headcountMatch[1]!, 10) }
      : {}),
    ...(timeMatch ? { timeHint: timeMatch[0]!.trim() } : {}),
  };
}

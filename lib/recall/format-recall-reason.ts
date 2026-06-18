import type { RecallTrigger } from "@/lib/recall/recall-types";
import type { RecallTriggerMatch } from "@/lib/recall/recall-trigger-matchers";

const TRIGGER_LABELS: Record<RecallTrigger, string> = {
  same_person: "같은 사람",
  same_place: "같은 장소",
  same_date: "작년 이맘때",
  same_city: "같은 도시",
  same_calendar_event: "같은 일정",
};

export function formatRecallReason(matches: readonly RecallTriggerMatch[]): string {
  if (matches.length === 0) {
    return "비슷한 경험이 있어요";
  }

  const parts = matches.map((match) => {
    const label = TRIGGER_LABELS[match.trigger];
    return match.detail ? `${label}(${match.detail})` : label;
  });

  return parts.slice(0, 3).join(" · ");
}

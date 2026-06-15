import { DEEP_RETRIEVAL_USER_IN_LOOP, runDeepScheduleRetrieval } from "@/lib/schedule-intelligence/deep-schedule-retrieval";
import type {
  ScheduleIntelligenceContext,
  ScheduleRetrievalWire,
} from "@/lib/schedule-intelligence/types";
import type { ScheduleQueryAnalysis } from "@/lib/schedule-intelligence/types";

export function queryScheduleStore(
  analysis: ScheduleQueryAnalysis,
  context: ScheduleIntelligenceContext,
  message = ""
): ScheduleRetrievalWire {
  return runDeepScheduleRetrieval({
    message,
    analysis,
    context,
  });
}

export function formatRetrievalSummary(wire: ScheduleRetrievalWire): string {
  if (wire.userInLoop && wire.emptyMessage) {
    return wire.emptyMessage;
  }

  if (wire.emptyMessage && wire.items.length === 0) {
    return wire.emptyMessage;
  }

  const lines = wire.items.map((item) => {
    const source =
      item.source === "activity_feed" || item.source === "notification"
        ? " · 활동로그"
        : "";
    const note = item.note ? ` (${item.note})` : "";
    return `· ${item.dateKey.slice(5).replace("-", "/")} ${item.time} — ${item.title}${source}${note}`;
  });

  const stageHint =
    wire.retrievalStage === 2
      ? "\n(키워드 부분 일치 · ±24시간 범위)"
      : wire.retrievalStage === 3
        ? "\n(캘린더 외 활동·알림 로그에서 발견)"
        : "";

  return `${wire.queryLabel} ${wire.items.length}건${stageHint}\n${lines.join("\n")}`;
}

export { DEEP_RETRIEVAL_USER_IN_LOOP };

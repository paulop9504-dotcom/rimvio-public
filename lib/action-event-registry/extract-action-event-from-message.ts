import { parseAbsoluteTimeFromText } from "@/lib/time-decision/parse-absolute-time";
import { resolveTemporalExpression } from "@/lib/time/temporal-resolver";
import { extractTaskLabelFromMessage } from "@/lib/time-decision/extract-task-label";
import type { ActionEventRecord } from "@/lib/action-event-registry/types";
import { detectActionEventKind } from "@/lib/action-event-registry/evaluate-lifecycle";

const PLACE =
  /(?:인천공항|김포공항|공항|치과|병원|역|센터|카페|식당|[가-힣]{2,8}역)/u;

/** Deterministic extract — middleware write path when schedule intent detected. */
export function tryExtractActionEventFromMessage(input: {
  message: string;
  referenceDate: string;
  now?: Date;
}): Omit<ActionEventRecord, "id" | "createdAt" | "updatedAt"> | null {
  const message = input.message.trim();
  if (!message || message.length > 240) {
    return null;
  }

  if (!/(?:일정|약속|예약|미팅|회의|\d{1,2}\s*시|공항|치과|병원|내일|모레)/u.test(message)) {
    return null;
  }

  const temporal = resolveTemporalExpression({
    message,
    referenceDate: input.referenceDate,
  });

  let targetTimeIso: string | null = temporal?.iso ?? null;
  if (!targetTimeIso) {
    const absolute = parseAbsoluteTimeFromText({
      message,
      referenceDate: input.referenceDate,
      now: input.now,
    });
    targetTimeIso = absolute?.iso ?? null;
  }

  if (!targetTimeIso) {
    return null;
  }

  const task = extractTaskLabelFromMessage(message);
  const placeMatch = message.match(PLACE);
  const placeName = placeMatch?.[0]?.trim() ?? (task !== "일정" ? task : null);
  const kind = detectActionEventKind(task, placeName);

  return {
    task: placeName ?? task,
    placeName,
    targetTimeIso,
    kind,
    priority: kind === "airport_travel" ? 95 : 82,
    sourceMessage: message,
    phone: null,
  };
}

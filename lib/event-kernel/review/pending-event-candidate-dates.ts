import type { PendingEventCandidate } from "@/lib/event-kernel/review/pending-event-candidate-store";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatIsoLocal(dateKey: string, hour: number, minute: number) {
  return `${dateKey}T${pad(hour)}:${pad(minute)}:00`;
}

export function mergeCandidateDateTime(input: {
  date: string;
  time: string | null;
  endTime?: string | null;
}): { start: string; end: string } {
  if (!input.time) {
    return { start: "", end: "" };
  }
  const [startHour, startMinute] = input.time.split(":").map(Number);
  const start = formatIsoLocal(input.date, startHour, startMinute);
  if (!input.endTime) {
    return { start, end: "" };
  }
  const [endHour, endMinute] = input.endTime.split(":").map(Number);
  return {
    start,
    end: formatIsoLocal(input.date, endHour, endMinute),
  };
}

/** Pure merge + patch shape (store write via applyPendingEventCandidateDatePatches). */
export function applyDatePatchToCandidate(
  row: PendingEventCandidate,
  date: string
): PendingEventCandidate {
  const { start, end } = mergeCandidateDateTime({
    date,
    time: row.time,
    endTime: row.endTime,
  });
  return {
    ...row,
    date,
    start,
    end: end || row.end,
  };
}

export type OcrReviewDatePatch = {
  candidateId: string;
  date: string;
};

export const OCR_REVIEW_DATES_PREFIX = "[ocr-review-dates]";

export function parseOcrReviewDatePayload(
  message: string
): OcrReviewDatePatch[] | null {
  const trimmed = message.trim();
  if (!trimmed.startsWith(OCR_REVIEW_DATES_PREFIX)) {
    return null;
  }
  const jsonPart = trimmed.slice(OCR_REVIEW_DATES_PREFIX.length).trim();
  try {
    const parsed = JSON.parse(jsonPart) as {
      patches?: Array<{ candidateId?: string; date?: string }>;
    };
    if (!Array.isArray(parsed.patches) || parsed.patches.length === 0) {
      return null;
    }
    const patches: OcrReviewDatePatch[] = [];
    for (const row of parsed.patches) {
      if (
        typeof row.candidateId === "string" &&
        typeof row.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(row.date)
      ) {
        patches.push({ candidateId: row.candidateId, date: row.date });
      }
    }
    return patches.length > 0 ? patches : null;
  } catch {
    return null;
  }
}

export function formatKoreanDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return `${month}월 ${day}일`;
}

export function formatResolutionConfirmLine(
  candidate: PendingEventCandidate
): string {
  const dateLabel = candidate.date
    ? formatKoreanDateLabel(candidate.date)
    : "";
  const timeLabel = candidate.time ?? "";
  const parts = [dateLabel, timeLabel, candidate.title].filter(Boolean);
  return parts.join(" ");
}

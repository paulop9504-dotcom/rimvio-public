import type { PlanWindowConfidence } from "@/lib/plan-context/plan-context-types";

function formatDateShort(iso: string): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) {
    return iso;
  }
  return when.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
}

/** Human label for plan window — e.g. 6월 12일 – 6월 15일 · 3박 */
export function formatPlanWindowLabel(input: {
  windowStartIso?: string;
  windowEndIso?: string | null;
  nights?: number;
  windowConfidence?: PlanWindowConfidence;
}): string | null {
  const start = input.windowStartIso?.trim();
  const end = input.windowEndIso?.trim();
  if (!start) {
    return null;
  }

  const startLabel = formatDateShort(start);
  if (!end) {
    return input.windowConfidence === "open"
      ? `${startLabel} 시작 · 기간 미정`
      : `${startLabel} 시작`;
  }

  const endLabel = formatDateShort(end);
  const suffix =
    input.windowConfidence === "estimated"
      ? " (추정)"
      : input.nights
        ? ` · ${input.nights}박`
        : "";

  return `${startLabel} – ${endLabel}${suffix}`;
}

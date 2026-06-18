/** Client/server shared — schedule retrieval register button prompt. */
export function buildScheduleRegisterPrompt(userMessage: string): string {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return "일정 시간과 이름을 알려주면 캘린더에 등록할게요";
  }
  if (/(?:등록|잡아|잡아줘|넣어|추가|캘린더)/u.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed} 일정으로 등록해줘`;
}

export function readScheduleRegisterPrompt(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if (record.scheduleRetrievalRegister !== true) {
    return null;
  }
  if (typeof record.scheduleRegisterPrompt === "string" && record.scheduleRegisterPrompt.trim()) {
    return record.scheduleRegisterPrompt.trim();
  }
  return "일정 시간과 이름을 알려주면 캘린더에 등록할게요";
}

export function readScheduleRetrievalCopyText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if (record.scheduleRetrieval !== true || !Array.isArray(record.items)) {
    return null;
  }
  const lines = record.items
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const row = item as { dateKey?: string; time?: string; title?: string; note?: string };
      if (!row.title) {
        return null;
      }
      const date = row.dateKey?.slice(5).replace("-", "/") ?? "";
      const note = row.note ? ` (${row.note})` : "";
      return `· ${date} ${row.time ?? ""} — ${row.title}${note}`.trim();
    })
    .filter(Boolean);
  return lines.length ? lines.join("\n") : null;
}

/** Resolve lens payload time to ISO — shared by confirm sheet + commit. */
export function resolveScheduleDatetime(payload?: {
  datetime?: string;
}): string | undefined {
  const raw = payload?.datetime?.trim();
  if (!raw) {
    return undefined;
  }
  if (raw.includes("T")) {
    return raw;
  }
  const [h, m] = raw.split(":").map((part) => Number(part));
  const date = new Date();
  date.setHours(h ?? 19, m ?? 0, 0, 0);
  if (date.getTime() < Date.now() - 60_000) {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString();
}

export type ScheduleEditFields = {
  date: string;
  time: string;
};

/** `input[type=date]` + `input[type=time]` values from ISO (local). */
export function parseScheduleEditFields(datetimeIso?: string): ScheduleEditFields {
  if (!datetimeIso?.trim()) {
    const fallback = new Date();
    fallback.setHours(12, 0, 0, 0);
    return {
      date: toDateInputValue(fallback),
      time: "12:00",
    };
  }
  const when = new Date(datetimeIso);
  if (Number.isNaN(when.getTime())) {
    const fallback = new Date();
    fallback.setHours(12, 0, 0, 0);
    return { date: toDateInputValue(fallback), time: "12:00" };
  }
  const hours = String(when.getHours()).padStart(2, "0");
  const minutes = String(when.getMinutes()).padStart(2, "0");
  return {
    date: toDateInputValue(when),
    time: `${hours}:${minutes}`,
  };
}

function toDateInputValue(when: Date): string {
  const y = when.getFullYear();
  const m = String(when.getMonth() + 1).padStart(2, "0");
  const d = String(when.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Merge edited date + time → ISO for calendar commit. */
export function combineScheduleEditFields(
  date: string,
  time: string,
): string | undefined {
  const dateKey = date.trim();
  if (!dateKey) {
    return undefined;
  }
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  const [hour, minute] = (time.trim() || "12:00").split(":").map((part) => Number(part));
  if (!year || !month || !day) {
    return undefined;
  }
  const when = new Date(year, month - 1, day, hour ?? 12, minute ?? 0, 0, 0);
  if (Number.isNaN(when.getTime())) {
    return undefined;
  }
  return when.toISOString();
}

export function formatScheduleConfirmWhen(datetimeIso?: string): string {
  if (!datetimeIso?.trim()) {
    return "시간 미정";
  }
  const when = new Date(datetimeIso);
  if (Number.isNaN(when.getTime())) {
    return datetimeIso;
  }
  const datePart = when.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const timePart = when.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart} ${timePart}`;
}

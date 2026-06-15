/** Pin open context — `2027.04.12` */
export function formatPinDateLabel(iso: string | null | undefined): string | null {
  const raw = iso?.trim();
  if (!raw) {
    return null;
  }
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) {
    return null;
  }
  const date = new Date(ms);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

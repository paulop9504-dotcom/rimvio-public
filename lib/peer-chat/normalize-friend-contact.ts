import { tryParseRimvioIdContact } from "@/lib/peer-chat/rimvio-id";

/** @친추 query — trim, strip leading @, collapse spaces. */
export function normalizeFriendContactQuery(raw: string): string {
  let q = raw.trim();
  if (q.startsWith("@")) {
    q = q.slice(1).trim();
  }
  return q;
}

/** "010… sypark" → phone part + optional Rimvio ID hint. */
export function parseFriendContactQuery(raw: string): {
  primary: string;
  rimvioIdHint: string | null;
} {
  const q = normalizeFriendContactQuery(raw);
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    const last = tokens[tokens.length - 1] ?? "";
    const hint = tryParseRimvioIdContact(last);
    if (hint) {
      const phonePart = tokens.slice(0, -1).join(" ").trim();
      return { primary: phonePart || q, rimvioIdHint: hint };
    }
  }
  return { primary: q, rimvioIdHint: null };
}
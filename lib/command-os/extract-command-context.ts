import type { CommandExtractedContext } from "@/lib/command-os/command-os-types";

const TIME_24H = /(\d{1,2})\s*:\s*(\d{2})/;
const TIME_KR = /(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/u;
const DATE_ISO = /\b(\d{4}-\d{2}-\d{2})\b/;
const DATE_KR = /(오늘|내일|모레)/u;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function normalizeTime(hour: number, minute = 0): string {
  const h = Math.min(23, Math.max(0, hour));
  const m = Math.min(59, Math.max(0, minute));
  return `${pad2(h)}:${pad2(m)}`;
}

export function extractCommandContext(query: string): CommandExtractedContext {
  let time: string | null = null;
  let subject = query.trim();
  let date: string | null = null;

  const iso = query.match(DATE_ISO);
  if (iso) {
    date = iso[1];
    subject = subject.replace(iso[0], "").trim();
  } else {
    const rel = query.match(DATE_KR);
    if (rel) {
      const base = new Date();
      if (rel[1] === "내일") {
        base.setDate(base.getDate() + 1);
      } else if (rel[1] === "모레") {
        base.setDate(base.getDate() + 2);
      }
      date = base.toISOString().slice(0, 10);
      subject = subject.replace(rel[0], "").trim();
    }
  }

  const match24 = query.match(TIME_24H);
  if (match24) {
    time = normalizeTime(Number(match24[1]), Number(match24[2]));
    subject = subject.replace(match24[0], "").trim();
  } else {
    const matchKr = query.match(TIME_KR);
    if (matchKr) {
      time = normalizeTime(
        Number(matchKr[1]),
        matchKr[2] ? Number(matchKr[2]) : 0
      );
      subject = subject.replace(matchKr[0], "").trim();
    }
  }

  subject = subject.replace(/\s+/g, " ").trim();

  return {
    time,
    subject: subject.length > 0 ? subject : null,
    date,
  };
}

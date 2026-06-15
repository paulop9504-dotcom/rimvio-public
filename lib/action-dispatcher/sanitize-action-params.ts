import { resolveSearchQuery } from "@/lib/search-intent/resolve-search-intent";

const PARAM_KEYS_TO_SANITIZE = [
  "dest",
  "destination",
  "query",
  "target",
  "place",
  "location",
] as const;

const FILLER_PREFIX = /^(?:음\.?\.?|어\.?\.?|저기\s*|그\s+|음\s+)*/giu;
const FILLER_WORDS = new Set(["저기", "그", "음", "어"]);

function stripFillers(value: string): string {
  return value.replace(FILLER_PREFIX, "").trim();
}

function tokenize(value: string): string[] {
  return value.trim().replace(/\s+/g, " ").split(/\s+/u).filter(Boolean);
}

function stripLeadingFillerWords(words: string[]): string[] {
  const next = [...words];
  while (next.length > 0 && FILLER_WORDS.has(next[0]!)) {
    next.shift();
  }
  return next;
}

function dedupeWordChunks(words: string[]): { value: string; deduped: boolean } {
  if (words.length < 2) {
    return { value: words.join(" "), deduped: false };
  }

  for (let len = Math.floor(words.length / 2); len >= 1; len--) {
    if (words.length % len !== 0) {
      continue;
    }
    const chunk = words.slice(0, len).join(" ");
    let repeated = true;
    for (let offset = len; offset < words.length; offset += len) {
      if (words.slice(offset, offset + len).join(" ") !== chunk) {
        repeated = false;
        break;
      }
    }
    if (repeated) {
      return { value: chunk, deduped: true };
    }
  }

  return { value: words.join(" "), deduped: false };
}

/** Collapse repeated phrases, then resolve through semantic frame (entity-locked). */
export function sanitizeParamValue(value: string): {
  value: string;
  deduped: boolean;
  note?: string;
} {
  const normalized = value.trim().replace(/\s+/g, " ");
  const withoutFillers = stripFillers(normalized);
  if (!withoutFillers) {
    return { value: normalized, deduped: false };
  }

  const words = stripLeadingFillerWords(tokenize(withoutFillers));
  const deduped = dedupeWordChunks(words);
  const collapsed = stripFillers(deduped.value) || withoutFillers;
  const semanticQuery = resolveSearchQuery({ text: collapsed });

  if (deduped.deduped) {
    return {
      value: semanticQuery,
      deduped: true,
      note: `중복 입력(${collapsed})을 감지하여 의도를 '${semanticQuery}' 하나로 정제함.`,
    };
  }

  return {
    value: semanticQuery,
    deduped: semanticQuery !== withoutFillers,
  };
}

export function sanitizeActionParams(
  params: Record<string, string>,
  _userMessage?: string
): {
  params: Record<string, string>;
  sanitized: boolean;
  thoughtNote?: string;
} {
  const out = { ...params };
  let sanitized = false;
  let thoughtNote: string | undefined;

  for (const key of PARAM_KEYS_TO_SANITIZE) {
    const raw = out[key];
    if (!raw) {
      continue;
    }
    const result = sanitizeParamValue(raw);
    out[key] = result.value;
    if (result.deduped) {
      sanitized = true;
      thoughtNote = result.note ?? thoughtNote;
    }
  }

  return { params: out, sanitized, thoughtNote };
}

export function appendSanitizerThought(
  thought: string | undefined,
  note: string | undefined
): string | undefined {
  if (!note) {
    return thought;
  }
  if (!thought?.trim()) {
    return note;
  }
  if (thought.includes(note) || thought.includes("중복 입력")) {
    return thought;
  }
  return `${thought} ${note}`.trim();
}

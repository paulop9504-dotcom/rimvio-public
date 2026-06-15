import { parseRelativeDateTimeFromText } from "@/lib/action-chat/action-agent-normalize";
import { resolveActionAgentReferenceDate } from "@/lib/action-chat/action-agent-prompt";
import { stripActionAgentNoise } from "@/lib/action-chat/action-agent-noise";
import { isMessyPlaceDump, stripUiNoise } from "@/lib/action-chat/clean-entity-text";
import type {
  DecomposedIntent,
  DecomposedTask,
  DecompositionWire,
} from "@/lib/action-chat/decomposition-types";
import {
  getDetailsFromFragment,
  getIntentFromFragment,
  getPlaceFromFragment,
} from "@/lib/action-chat/fragment-extractors";

const MULTI_INTENT_SPLIT =
  /\s*(?:하고\s+|그리고\s+|,\s*|\s+후에\s+|\s+다음에\s+|\s+랑\s+|보내고\s+)/;

const MULTI_INTENT_VERB =
  /(?:쇼핑|예약|일정|약속|가야|길찾기|네비|출발|이동|미팅|회의|알람|송금|토스|택시|카톡|문자|전화|배송)/;

function hasMultiIntentSignals(message: string) {
  return MULTI_INTENT_SPLIT.test(message) && MULTI_INTENT_VERB.test(message);
}

function splitIntoFragments(message: string): string[] {
  return message
    .split(MULTI_INTENT_SPLIT)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

function buildTaskFromFragment(
  raw_snippet: string,
  referenceDate: string
): DecomposedTask {
  const intent = getIntentFromFragment(raw_snippet);
  const place = getPlaceFromFragment(raw_snippet);
  const datetime = parseRelativeDateTimeFromText(raw_snippet, referenceDate);
  const details = getDetailsFromFragment(raw_snippet, intent);

  return {
    intent,
    place,
    details,
    raw_snippet,
    datetime,
  };
}

function normalizeIntent(value: unknown): DecomposedIntent | null {
  if (typeof value !== "string") {
    return null;
  }
  const upper = value.trim().toUpperCase();
  if (
    upper === "SHOPPING" ||
    upper === "RESERVATION" ||
    upper === "TASK" ||
    upper === "NAVIGATION" ||
    upper === "SCHEDULE" ||
    upper === "FINANCE" ||
    upper === "MOBILITY" ||
    upper === "COMMUNICATION" ||
    upper === "MEDIA"
  ) {
    return upper;
  }
  return null;
}

/**
 * Step 1 — 해체: full input → intent-scoped task fragments.
 * Returns null for messy entity dumps (entity architect handles those).
 */
export function decomposeInput(
  rawMessage: string,
  options?: { referenceDate?: string | null }
): DecompositionWire | null {
  const referenceDate = resolveActionAgentReferenceDate(options?.referenceDate);
  const cleaned = stripActionAgentNoise(stripUiNoise(rawMessage.trim()));
  if (!cleaned) {
    return null;
  }

  if (isMessyPlaceDump(cleaned)) {
    return null;
  }

  if (hasMultiIntentSignals(cleaned)) {
    const fragments = splitIntoFragments(cleaned);
    if (fragments.length >= 2) {
      return { tasks: fragments.map((fragment) => buildTaskFromFragment(fragment, referenceDate)) };
    }
  }

  return { tasks: [buildTaskFromFragment(cleaned, referenceDate)] };
}

export function parseDecompositionJson(raw: string): DecompositionWire | null {
  const jsonText = raw.trim().match(/\{[\s\S]*\}/)?.[0];
  if (!jsonText) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText) as { tasks?: unknown };
    if (!Array.isArray(parsed.tasks)) {
      return null;
    }

    const tasks: DecomposedTask[] = [];

    for (const entry of parsed.tasks) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const row = entry as Record<string, unknown>;
      const intent = normalizeIntent(row.intent);
      const raw_snippet =
        typeof row.raw_snippet === "string" ? row.raw_snippet.trim() : "";
      if (!intent || !raw_snippet) {
        continue;
      }

      const fragmentPlace = getPlaceFromFragment(raw_snippet);
      const place =
        typeof row.place === "string" && row.place.trim()
          ? getPlaceFromFragment(row.place) ?? row.place.trim()
          : fragmentPlace;

      tasks.push({
        intent,
        place,
        details:
          typeof row.details === "string" && row.details.trim()
            ? row.details.trim()
            : getDetailsFromFragment(raw_snippet, intent),
        raw_snippet,
        datetime:
          typeof row.datetime === "string" && row.datetime.trim()
            ? row.datetime.trim()
            : null,
      });
    }

    return tasks.length > 0 ? { tasks } : null;
  } catch {
    return null;
  }
}

/** Primary place-bearing task for confirm / navigation roots. */
export function pickPrimaryPlaceTask(wire: DecompositionWire | null): DecomposedTask | null {
  if (!wire?.tasks.length) {
    return null;
  }

  const priority: DecomposedIntent[] = [
    "NAVIGATION",
    "SHOPPING",
    "RESERVATION",
    "SCHEDULE",
    "TASK",
  ];

  for (const intent of priority) {
    const match = wire.tasks.find((task) => task.intent === intent && task.place);
    if (match) {
      return match;
    }
  }

  return wire.tasks.find((task) => task.place) ?? wire.tasks[0] ?? null;
}

import { extractPlaceEntities, isMessyPlaceDump, stripUiNoise } from "@/lib/action-chat/clean-entity-text";
import {
  normalizeExtractedPlaceData,
  sanitizePlaceNameForNavigation,
} from "@/lib/action-chat/resolve-navigation-place";
import {
  normalizeActionAgentAddress,
  normalizeActionAgentPhone,
  parseRelativeDateTimeFromText,
} from "@/lib/action-chat/action-agent-normalize";
import { stripActionAgentNoise } from "@/lib/action-chat/action-agent-noise";
import { decomposeInput } from "@/lib/action-chat/decompose-input";
import { deepLinkDispatchToTaskResult } from "@/lib/deep-link-dispatch/task-bridge";
import { dispatchTasks } from "@/lib/action-chat/dispatch-tasks";
import {
  actionAgentWiresToLinkItems,
  buildActionAgentTaskActions,
  normalizeActionAgentExtracted,
  summarizeActionAgentTask,
} from "@/lib/action-chat/build-action-agent-task-actions";
import type {
  ActionAgentBatchItem,
  ActionAgentBatchWire,
  ActionAgentTaskResult,
} from "@/lib/action-chat/action-agent-types";
import { extractExplicitUrls } from "@/lib/screenshot/explicit-urls";
import { extractPhoneFromText } from "@/lib/enrichers/extract-phone";
import { readNavAddress } from "@/lib/action-chat/normalize-address";
import { resolveActionAgentReferenceDate } from "@/lib/action-chat/action-agent-prompt";

const SCHEDULE_HINT = /일정|약속|미팅|회의|예약|내일|모레|주말|다음\s*달|\d{1,2}:\d{2}|\d{1,2}월\s*\d{1,2}일/;

function buildTask(
  type: ActionAgentTaskResult["type"],
  extracted: Partial<ActionAgentTaskResult["extracted_data"]>,
  sourceMessage?: string | null
): ActionAgentTaskResult | null {
  const extracted_data = normalizeExtractedPlaceData(
    normalizeActionAgentExtracted(extracted, sourceMessage),
    sourceMessage
  );
  const hasSignal = Object.values(extracted_data).some(Boolean);
  if (!hasSignal) {
    return null;
  }

  const actions = buildActionAgentTaskActions(type, extracted_data);
  if (actions.length === 0) {
    return null;
  }

  return { type, extracted_data, actions };
}

/** Legacy field-level extraction for pasted entity dumps (phone + address + hours). */
function processEntityDumpBatch(
  rawMessage: string,
  options?: { referenceDate?: string | null }
): ActionAgentBatchWire | null {
  const referenceDate = resolveActionAgentReferenceDate(options?.referenceDate);
  const cleaned = stripActionAgentNoise(stripUiNoise(rawMessage));
  if (!cleaned.trim()) {
    return null;
  }

  const info = extractPlaceEntities(cleaned);
  const placeLabel = sanitizePlaceNameForNavigation(
    [info.name, info.branch].filter(Boolean).join(" ").trim() || null,
    cleaned
  );
  const phone = normalizeActionAgentPhone(extractPhoneFromText(cleaned));
  const address = normalizeActionAgentAddress(readNavAddress(info.address) ?? info.address?.display);
  const datetime = parseRelativeDateTimeFromText(cleaned, referenceDate);
  const urls = extractExplicitUrls(cleaned).filter((url) => !/map\.|kakaomap|naver\.com\/map/i.test(url));
  const scheduleNote =
    cleaned.match(/(?:일정|약속|미팅|회의|예약)\s*[:：]?\s*([^\n]{2,40})/)?.[1]?.trim() ??
    info.name ??
    null;

  const results: ActionAgentTaskResult[] = [];

  const phoneTask = buildTask("PHONE", { phone }, cleaned);
  if (phoneTask) {
    results.push(phoneTask);
  }

  const addressTask = buildTask("ADDRESS", { address, place_name: placeLabel }, cleaned);
  if (addressTask) {
    results.push(addressTask);
  }

  const datetimeTask = buildTask(
    "DATETIME",
    { datetime, schedule_note: scheduleNote, place_name: placeLabel },
    cleaned
  );
  if (datetimeTask && datetime) {
    results.push(datetimeTask);
  }

  for (const url of urls.slice(0, 2)) {
    const urlTask = buildTask("URL", { url }, cleaned);
    if (urlTask) {
      results.push(urlTask);
    }
  }

  if (results.length === 0 && (placeLabel || info.address)) {
    const placeTask = buildTask(
      "PLACE",
      {
        place_name: placeLabel,
        address,
        phone,
        url: info.website ?? urls[0] ?? null,
      },
      cleaned
    );
    if (placeTask) {
      results.push(placeTask);
    }
  }

  return results.length > 0 ? { results } : null;
}

export function isActionAgentBatchCandidate(message: string) {
  const cleaned = stripActionAgentNoise(stripUiNoise(message));
  let signals = 0;

  if (extractPhoneFromText(cleaned)) {
    signals += 1;
  }
  if (normalizeActionAgentAddress(extractPlaceEntities(cleaned).address?.display ?? "")) {
    signals += 1;
  }
  if (SCHEDULE_HINT.test(cleaned) && parseRelativeDateTimeFromText(cleaned, resolveActionAgentReferenceDate())) {
    signals += 1;
  }
  if (extractExplicitUrls(cleaned).length > 0) {
    signals += 1;
  }

  const decomposed = decomposeInput(message);
  if (decomposed && decomposed.tasks.length >= 2) {
    return true;
  }

  return signals >= 2 || cleaned.split(/\n{2,}/).filter(Boolean).length >= 2;
}

export function processActionAgentBatch(
  rawMessage: string,
  options?: { referenceDate?: string | null }
): ActionAgentBatchWire | null {
  const cleaned = stripActionAgentNoise(stripUiNoise(rawMessage));
  if (!cleaned.trim()) {
    return null;
  }

  if (isMessyPlaceDump(cleaned)) {
    return processEntityDumpBatch(rawMessage, options);
  }

  const decomposed = decomposeInput(rawMessage, options);
  if (decomposed && decomposed.tasks.length >= 2) {
    const dispatched = dispatchTasks(decomposed, {
      referenceDate: options?.referenceDate,
      fullMessage: rawMessage,
    });
    if (dispatched?.results.length) {
      return dispatched;
    }
  }

  const singleDeepLink = deepLinkDispatchToTaskResult(cleaned);
  if (singleDeepLink) {
    return { results: [singleDeepLink] };
  }

  if (decomposed) {
    const dispatched = dispatchTasks(decomposed, {
      referenceDate: options?.referenceDate,
      fullMessage: rawMessage,
    });
    if (dispatched?.results.length) {
      return dispatched;
    }
  }

  return processEntityDumpBatch(rawMessage, options);
}

export function actionAgentBatchToItems(
  wire: ActionAgentBatchWire
): ActionAgentBatchItem[] {
  return wire.results.map((task) => ({
    type: task.type,
    extracted_data: task.extracted_data,
    actions: actionAgentWiresToLinkItems(task),
    summary: summarizeActionAgentTask(task.type, task.extracted_data),
  }));
}

export function parseActionAgentJson(raw: string): ActionAgentBatchWire | null {
  const trimmed = raw.trim();
  const jsonText = trimmed.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonText) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText) as { results?: unknown };
    if (!Array.isArray(parsed.results)) {
      return null;
    }

    const results = parsed.results
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const row = entry as Partial<ActionAgentTaskResult>;
        const type = row.type;
        if (typeof type !== "string") {
          return null;
        }

        const snippet =
          typeof (row.extracted_data as { place_name?: string })?.place_name === "string"
            ? (row.extracted_data as { place_name: string }).place_name
            : null;

        const extracted = normalizeActionAgentExtracted(
          row.extracted_data as Partial<ActionAgentTaskResult["extracted_data"]>,
          snippet
        );

        if (extracted.phone) {
          extracted.phone = normalizeActionAgentPhone(extracted.phone);
        }
        if (extracted.address) {
          extracted.address = normalizeActionAgentAddress(extracted.address);
        }

        const actions = Array.isArray(row.actions)
          ? row.actions.filter(
              (action): action is ActionAgentTaskResult["actions"][number] =>
                Boolean(action) &&
                typeof action === "object" &&
                typeof (action as { label?: string }).label === "string" &&
                typeof (action as { url?: string }).url === "string"
            )
          : [];

        const built = buildTask(type as ActionAgentTaskResult["type"], extracted, snippet);
        if (!built) {
          return null;
        }

        return {
          ...built,
          actions: actions.length ? actions : built.actions,
        };
      })
      .filter((task): task is ActionAgentTaskResult => Boolean(task));

    return results.length > 0 ? { results } : null;
  } catch {
    return null;
  }
}

import {
  normalizeActionAgentAddress,
  normalizeActionAgentPhone,
  parseRelativeDateTimeFromText,
} from "@/lib/action-chat/action-agent-normalize";
import { resolveActionAgentReferenceDate } from "@/lib/action-chat/action-agent-prompt";
import { decomposeInput } from "@/lib/action-chat/decompose-input";
import { stripActionAgentNoise } from "@/lib/action-chat/action-agent-noise";
import { stripUiNoise } from "@/lib/action-chat/clean-entity-text";
import type { DecomposedTask, DecompositionWire } from "@/lib/action-chat/decomposition-types";
import {
  getAddressFromFragment,
  getPlaceFromFragment,
} from "@/lib/action-chat/fragment-extractors";
import {
  buildActionAgentTaskActions,
  normalizeActionAgentExtracted,
} from "@/lib/action-chat/build-action-agent-task-actions";
import type {
  ActionAgentBatchWire,
  ActionAgentTaskResult,
  ActionAgentTaskType,
} from "@/lib/action-chat/action-agent-types";
import { deepLinkDispatchToTaskResult } from "@/lib/deep-link-dispatch/task-bridge";
import { normalizeExtractedPlaceData } from "@/lib/action-chat/resolve-navigation-place";
import { extractExplicitUrls } from "@/lib/screenshot/explicit-urls";
import { extractPhoneFromText } from "@/lib/enrichers/extract-phone";

function buildTask(
  type: ActionAgentTaskType,
  extracted: Parameters<typeof normalizeActionAgentExtracted>[0],
  sourceSnippet: string
): ActionAgentTaskResult | null {
  const extracted_data = normalizeExtractedPlaceData(
    normalizeActionAgentExtracted(extracted, sourceSnippet),
    sourceSnippet
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

function pushUnique(
  results: ActionAgentTaskResult[],
  task: ActionAgentTaskResult | null,
  seen: Set<string>
) {
  if (!task) {
    return;
  }
  const key = `${task.type}:${JSON.stringify(task.extracted_data)}`;
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  results.push(task);
}

function dispatchSingleTask(
  task: DecomposedTask,
  referenceDate: string,
  results: ActionAgentTaskResult[],
  seen: Set<string>
) {
  const snippet = task.raw_snippet;

  const deepLinkTask = deepLinkDispatchToTaskResult(snippet);
  if (deepLinkTask) {
    pushUnique(results, deepLinkTask, seen);
    return;
  }

  const place = task.place ?? getPlaceFromFragment(snippet);
  const address = getAddressFromFragment(snippet);
  const datetime =
    task.datetime ?? parseRelativeDateTimeFromText(snippet, referenceDate);
  const phone = normalizeActionAgentPhone(extractPhoneFromText(snippet));
  const urls = extractExplicitUrls(snippet).filter(
    (url) => !/map\.|kakaomap|naver\.com\/map/i.test(url)
  );

  switch (task.intent) {
    case "NAVIGATION":
      if (datetime) {
        pushUnique(
          results,
          buildTask(
            "DATETIME",
            {
              datetime,
              schedule_note: task.details || `${place ?? "목적지"} 이동`,
              place_name: place,
            },
            snippet
          ),
          seen
        );
      }
      if (address) {
        pushUnique(
          results,
          buildTask("ADDRESS", { address, place_name: place }, snippet),
          seen
        );
      } else if (place) {
        pushUnique(
          results,
          buildTask("PLACE", { place_name: place, address, phone }, snippet),
          seen
        );
      }
      break;

    case "SHOPPING":
      if (datetime) {
        pushUnique(
          results,
          buildTask(
            "DATETIME",
            {
              datetime,
              schedule_note: task.details || `${place ?? "쇼핑"} 일정`,
              place_name: place,
            },
            snippet
          ),
          seen
        );
      }
      if (place || address) {
        pushUnique(
          results,
          buildTask(
            address ? "ADDRESS" : "PLACE",
            { place_name: place, address, phone },
            snippet
          ),
          seen
        );
      }
      break;

    case "RESERVATION":
    case "SCHEDULE":
      if (datetime) {
        pushUnique(
          results,
          buildTask(
            "DATETIME",
            {
              datetime,
              schedule_note: task.details || `${place ?? "예약"} 일정`,
              place_name: place,
            },
            snippet
          ),
          seen
        );
      }
      if (place && !address) {
        pushUnique(
          results,
          buildTask("PLACE", { place_name: place, phone }, snippet),
          seen
        );
      }
      break;

    case "TASK":
    default:
      if (datetime) {
        pushUnique(
          results,
          buildTask(
            "DATETIME",
            {
              datetime,
              schedule_note: task.details,
              place_name: place,
            },
            snippet
          ),
          seen
        );
      }
      if (place || address) {
        pushUnique(
          results,
          buildTask(
            address ? "ADDRESS" : "PLACE",
            { place_name: place, address, phone },
            snippet
          ),
          seen
        );
      }
      break;
  }

  if (phone) {
    pushUnique(results, buildTask("PHONE", { phone }, snippet), seen);
  }
  for (const url of urls.slice(0, 1)) {
    pushUnique(results, buildTask("URL", { url }, snippet), seen);
  }
}

/**
 * Step 2 — Action Manager: route each decomposed task to its channel independently.
 * Failure in one task does not block others.
 */
export function dispatchTasks(
  wire: DecompositionWire,
  options?: { referenceDate?: string | null; fullMessage?: string | null }
): ActionAgentBatchWire | null {
  const referenceDate = resolveActionAgentReferenceDate(options?.referenceDate);
  const results: ActionAgentTaskResult[] = [];
  const seen = new Set<string>();

  for (const task of wire.tasks) {
    dispatchSingleTask(task, referenceDate, results, seen);
  }

  const cleaned = stripActionAgentNoise(
    stripUiNoise(options?.fullMessage?.trim() ?? "")
  );
  if (cleaned) {
    const globalPhone = normalizeActionAgentPhone(extractPhoneFromText(cleaned));
    if (globalPhone && !results.some((task) => task.type === "PHONE")) {
      pushUnique(results, buildTask("PHONE", { phone: globalPhone }, cleaned), seen);
    }

    const globalUrls = extractExplicitUrls(cleaned).filter(
      (url) => !/map\.|kakaomap|naver\.com\/map/i.test(url)
    );
    if (globalUrls.length && !results.some((task) => task.type === "URL")) {
      pushUnique(results, buildTask("URL", { url: globalUrls[0]! }, cleaned), seen);
    }
  }

  return results.length > 0 ? { results } : null;
}

export function decomposeAndDispatch(
  rawMessage: string,
  options?: { referenceDate?: string | null }
): ActionAgentBatchWire | null {
  const wire = decomposeInput(rawMessage, options);
  if (!wire) {
    return null;
  }
  return dispatchTasks(wire, { ...options, fullMessage: rawMessage });
}


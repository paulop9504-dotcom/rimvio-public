import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ExecutionProfileId } from "@/lib/globe/passive-context/types";
import { readExecutionProfileId } from "@/lib/globe/passive-context/infer-execution-profile";
import { isEventWithinPrepWindow } from "@/lib/globe/passive-context/resolve-parent-travel-context";
import { inferPrepRequirements } from "@/lib/globe/prep/infer-prep-requirements";
import {
  PREP_CHECKLIST_META_KEY,
  type PrepChecklistItem,
  type PrepChecklistState,
} from "@/lib/globe/prep/prep-types";

function readChecklistState(value: unknown): PrepChecklistState | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Record<string, unknown>;
  const profileId = row.profileId;
  if (profileId !== "theme_park_day" && profileId !== "outdoor_long_day") {
    return null;
  }
  const itemsRaw = Array.isArray(row.items) ? row.items : [];
  const items: PrepChecklistItem[] = [];
  for (const item of itemsRaw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const entry = item as Record<string, unknown>;
    const id = entry.id;
    const labelKo = typeof entry.labelKo === "string" ? entry.labelKo.trim() : "";
    if (
      (id !== "power_bank" &&
        id !== "comfortable_shoes" &&
        id !== "sun_protection" &&
        id !== "water" &&
        id !== "ticket_qr") ||
      !labelKo
    ) {
      continue;
    }
    items.push({
      id,
      labelKo,
      checked: entry.checked === true,
      checkedAtIso:
        typeof entry.checkedAtIso === "string" ? entry.checkedAtIso : null,
    });
  }
  const updatedAtIso = typeof row.updatedAtIso === "string" ? row.updatedAtIso : "";
  if (!updatedAtIso || items.length === 0) {
    return null;
  }
  return { profileId, updatedAtIso, items };
}

export function readPrepChecklistState(
  event: EventCandidate | null | undefined,
): PrepChecklistState | null {
  return readChecklistState(event?.metadata?.[PREP_CHECKLIST_META_KEY]);
}

export function buildPrepChecklistState(input: {
  event: EventCandidate;
  now?: Date;
}): PrepChecklistState | null {
  const profileId = readExecutionProfileId(input.event.metadata);
  if (!profileId) {
    return null;
  }
  const existing = readPrepChecklistState(input.event);
  if (existing) {
    return existing;
  }
  const requirements = inferPrepRequirements(profileId);
  if (requirements.length === 0) {
    return null;
  }
  const nowIso = (input.now ?? new Date()).toISOString();
  return {
    profileId,
    updatedAtIso: nowIso,
    items: requirements.map((row) => ({
      id: row.id,
      labelKo: row.labelKo,
      checked: false,
      checkedAtIso: null,
    })),
  };
}

export function shouldOfferPrepChecklist(
  event: EventCandidate | null | undefined,
  now = new Date(),
): boolean {
  if (!event) {
    return false;
  }
  const profileId = readExecutionProfileId(event.metadata);
  if (!profileId) {
    return false;
  }
  return isEventWithinPrepWindow(event, now);
}

export function prepChecklistHeadline(profileId: PrepChecklistState["profileId"]): string {
  if (profileId === "theme_park_day") {
    return "오늘 테마파크 · 준비물";
  }
  return "오늘 밖에서 · 준비물";
}

export function prepChecklistCompletionLine(checked: number, total: number): string | null {
  if (total <= 0 || checked < total) {
    return null;
  }
  return "다 챙겼어요 · 즐거운 시간 보내세요";
}

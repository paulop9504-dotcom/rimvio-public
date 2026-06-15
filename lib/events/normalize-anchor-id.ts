import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  findEventCandidate,
  findEventCandidateByMessageId,
} from "@/lib/events/event-store";

/** Canonical EventCandidate identity — always `ec-*`. */
export type EcAnchorId = string;

const EC_PREFIX = /^ec-/u;
const AUXILIARY_ID = /^(?:trip-|dining:|conv:|architect-)/u;

const TIMELINE_ACTION_SUFFIXES = [
  ":nav-active",
  ":nav-warm",
  ":nav",
  ":call-warm",
  ":call-far",
  ":call",
  ":transit",
  ":info",
  ":zoom",
  ":expense",
  ":next",
] as const;

export type NormalizeAnchorInput =
  | EventCandidate
  | string
  | {
      eventId?: string | null;
      anchorId?: string | null;
      actionId?: string | null;
      messageId?: string | null;
    };

function isEcId(value: string): value is EcAnchorId {
  return EC_PREFIX.test(value.trim());
}

function resolveMessageIdToEc(messageId: string): EcAnchorId | null {
  const event = findEventCandidateByMessageId(messageId);
  if (event && isEcId(event.id)) {
    return event.id;
  }
  return null;
}

function extractEcFromActionKey(raw: string): EcAnchorId | null {
  const trimmed = raw.trim();
  if (!trimmed || AUXILIARY_ID.test(trimmed)) {
    return null;
  }

  if (trimmed.startsWith("msg:")) {
    const messageId = trimmed.slice(4).split(":")[0]?.trim();
    return messageId ? resolveMessageIdToEc(messageId) : null;
  }

  if (isEcId(trimmed)) {
    for (const suffix of TIMELINE_ACTION_SUFFIXES) {
      if (trimmed.endsWith(suffix)) {
        const candidate = trimmed.slice(0, -suffix.length);
        if (isEcId(candidate)) {
          return candidate;
        }
      }
    }

    const lastColon = trimmed.lastIndexOf(":");
    if (lastColon > 0) {
      const prefix = trimmed.slice(0, lastColon);
      if (isEcId(prefix)) {
        return prefix;
      }
    }

    if (findEventCandidate(trimmed)) {
      return trimmed;
    }
    return trimmed;
  }

  const colonIdx = trimmed.indexOf(":");
  if (colonIdx > 0) {
    const head = trimmed.slice(0, colonIdx);
    const suffix = trimmed.slice(colonIdx);
    const isTimelineSuffix = TIMELINE_ACTION_SUFFIXES.some(
      (item) => suffix === item || suffix.startsWith(item)
    );
    if (isTimelineSuffix) {
      const fromMessage = resolveMessageIdToEc(head);
      if (fromMessage) {
        return fromMessage;
      }
    }
  }

  return resolveMessageIdToEc(trimmed);
}

/**
 * Single identity spine — map any incoming anchor key to canonical `ec-*` or null.
 * Trip / dining / template auxiliary IDs are never converted.
 */
export function normalizeAnchorId(input: NormalizeAnchorInput): EcAnchorId | null {
  if (!input) {
    return null;
  }

  if (typeof input === "object" && "lifecycle" in input && "id" in input) {
    return isEcId(input.id) ? input.id : null;
  }

  if (typeof input === "string") {
    return extractEcFromActionKey(input);
  }

  if (input.eventId) {
    const fromEvent = extractEcFromActionKey(input.eventId);
    if (fromEvent) {
      return fromEvent;
    }
  }

  if (input.anchorId) {
    const fromAnchor = extractEcFromActionKey(input.anchorId);
    if (fromAnchor) {
      return fromAnchor;
    }
  }

  if (input.actionId) {
    const fromAction = extractEcFromActionKey(input.actionId);
    if (fromAction) {
      return fromAction;
    }
  }

  if (input.messageId) {
    return resolveMessageIdToEc(input.messageId.trim());
  }

  return null;
}

export const TIMELINE_DOCK_ACTION_TYPES = new Set([
  "NAVIGATE",
  "CALL",
  "TRANSIT",
  "TAXI",
  "ZOOM",
  "CHECK",
  "TICKET_QR",
]);

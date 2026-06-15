import {
  readExperienceIntentFromEvent,
  resolveExperienceIntent,
} from "@/lib/experience-intent/resolve-experience-intent";
import type { ExperienceRoom } from "@/lib/experience-room/experience-room-types";
import { resolveExperienceRoomId } from "@/lib/experience-room/resolve-experience-room-id";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import type { SharedGlobePin } from "@/lib/peer-chat/globe-pin-types";

function readParticipants(event: EventCandidate): ExperienceRoom["participants"] {
  const meta = event.metadata ?? {};
  const plan = readPlanContextFromEvent(event);
  const names = new Map<string, ExperienceRoom["participants"][number]>();

  const add = (displayName: string, role?: "host" | "guest" | "organizer") => {
    const label = displayName.trim();
    if (!label) {
      return;
    }
    if (!names.has(label)) {
      names.set(label, {
        displayName: label,
        role,
        peerThreadId: plan?.peerThreadId ?? undefined,
      });
    }
  };

  add(plan?.peerDisplayName ?? "", "host");
  if (typeof meta.planPeerDisplayName === "string") {
    add(meta.planPeerDisplayName, "host");
  }
  if (typeof meta.peerDisplayName === "string") {
    add(meta.peerDisplayName);
  }

  const attendees = meta.attendees;
  if (Array.isArray(attendees)) {
    for (const row of attendees) {
      if (typeof row === "string") {
        add(row, "guest");
      }
    }
  }

  return [...names.values()];
}

/** Pure read — project ExperienceRoom from primary event + optional pins. */
export function projectExperienceRoom(input: {
  primaryEvent: EventCandidate;
  relatedEventIds?: readonly string[];
  globePins?: readonly SharedGlobePin[];
}): ExperienceRoom {
  const event = input.primaryEvent;
  const plan = readPlanContextFromEvent(event);
  const stamped = readExperienceIntentFromEvent(event);
  const resolution = stamped ?? resolveExperienceIntent(event);
  const captures = readFeedCaptureFragments(event).map((row) => ({
    id: row.id,
    kind: row.kind,
    eventId: event.id,
    capturedAtIso: row.capturedAtIso,
    verified: row.verified,
  }));

  const threadIds = new Set<string>();
  const planThread = plan?.peerThreadId?.trim();
  if (planThread) {
    threadIds.add(planThread);
  }
  const metaThread =
    typeof event.metadata?.planPeerThreadId === "string"
      ? event.metadata.planPeerThreadId.trim()
      : null;
  if (metaThread) {
    threadIds.add(metaThread);
  }

  const pinIds = (input.globePins ?? []).map((pin) => pin.payload.pinId);
  const eventIds = [
    event.id,
    ...(input.relatedEventIds ?? []).filter((id) => id !== event.id),
  ];

  return {
    id: resolveExperienceRoomId(event.id),
    intent: resolution.intent,
    title: event.title,
    participants: readParticipants(event),
    threadIds: [...threadIds],
    eventIds,
    captures,
    pinIds,
    createdAt: event.createdAt,
    windowStartIso: event.datetime ?? undefined,
    windowEndIso: plan?.windowEndIso ?? null,
  };
}

import type { ExperienceRoom } from "@/lib/experience-room/experience-room-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import type { SharedGlobePin } from "@/lib/peer-chat/globe-pin-types";
import {
  SHARED_GLOBE_MIN_JOINT_VERIFIERS,
  SHARED_GLOBE_MIN_MEMBERS,
} from "@/lib/shared-globe/shared-globe-types";

export type SharedGlobeAutoCreateSignals = {
  memberCount: number;
  jointVerifierCount: number;
  verifiedCaptureCount: number;
  pinAuthorCount: number;
  eligible: boolean;
  reasons: readonly string[];
};

function collectJointVerifiers(
  event: EventCandidate,
  pins: readonly SharedGlobePin[],
): Set<string> {
  const verifiers = new Set<string>();

  for (const capture of readFeedCaptureFragments(event)) {
    if (capture.verified) {
      verifiers.add(`capture:${capture.id}`);
    }
  }

  for (const pin of pins) {
    verifiers.add(`pin:${pin.senderUserId}`);
  }

  return verifiers;
}

/** Auto-create gate — 3+ members · same ExperienceRoom · joint verify. */
export function evaluateSharedGlobeAutoCreate(input: {
  experienceRoom: ExperienceRoom;
  primaryEvent: EventCandidate;
  globePins?: readonly SharedGlobePin[];
}): SharedGlobeAutoCreateSignals {
  const memberCount = input.experienceRoom.participants.length;
  const verifiers = collectJointVerifiers(
    input.primaryEvent,
    input.globePins ?? [],
  );
  const verifiedCaptureCount = readFeedCaptureFragments(input.primaryEvent).filter(
    (row) => row.verified,
  ).length;
  const pinAuthorCount = new Set(
    (input.globePins ?? []).map((pin) => pin.senderUserId),
  ).size;
  const jointVerifierCount = verifiers.size;

  const reasons: string[] = [];
  if (memberCount < SHARED_GLOBE_MIN_MEMBERS) {
    reasons.push(`members<${SHARED_GLOBE_MIN_MEMBERS}`);
  }
  if (jointVerifierCount < SHARED_GLOBE_MIN_JOINT_VERIFIERS) {
    reasons.push(`joint_verify<${SHARED_GLOBE_MIN_JOINT_VERIFIERS}`);
  }

  const eligible =
    memberCount >= SHARED_GLOBE_MIN_MEMBERS &&
    jointVerifierCount >= SHARED_GLOBE_MIN_JOINT_VERIFIERS;

  return {
    memberCount,
    jointVerifierCount,
    verifiedCaptureCount,
    pinAuthorCount,
    eligible,
    reasons,
  };
}

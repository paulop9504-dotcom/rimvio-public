import type { EventCandidate } from "@/lib/events/event-candidate";
import { projectEventToExperienceVolume } from "@/lib/experience-graph/project-event-to-volume";
import { buildExperienceRecallCaption } from "@/lib/feed/build-experience-recall-caption";
import { buildRecallMedia } from "@/lib/recall/build-recall-media";
import { formatRecallReason } from "@/lib/recall/format-recall-reason";
import type { RecallTriggerMatch } from "@/lib/recall/recall-trigger-matchers";
import type { RecallEventSnapshot } from "@/lib/recall/recall-event-snapshot";
import { scoreRecallConfidence } from "@/lib/recall/score-recall-confidence";
import type { RecallCandidate } from "@/lib/recall/recall-types";

export function buildRecallCandidate(input: {
  pastEvent: EventCandidate;
  pastSnapshot: RecallEventSnapshot;
  matches: readonly RecallTriggerMatch[];
  now?: Date;
}): RecallCandidate {
  const now = input.now ?? new Date();
  const triggers = input.matches.map((row) => row.trigger);
  const confidence = scoreRecallConfidence(input.matches, input.pastSnapshot, now);
  const media = buildRecallMedia(input.pastEvent);
  const volume = projectEventToExperienceVolume(input.pastEvent);

  let headline =
    buildExperienceRecallCaption({ volume }) || input.pastSnapshot.headline;

  const peer = input.pastSnapshot.people[0];
  const place = input.pastSnapshot.place;
  const year = input.pastSnapshot.year;
  if (peer && place && year && !headline.includes(peer)) {
    headline = `${year}년에 ${peer}랑 ${place}`;
  }

  const candidateId = `recall:${input.pastEvent.id}:${triggers.sort().join("+")}`;

  return {
    id: candidateId,
    eventId: input.pastEvent.id,
    triggers,
    headline,
    media,
    reason: formatRecallReason(input.matches),
    confidence,
    feedHref: `/?recallEvent=${encodeURIComponent(input.pastEvent.id)}`,
  };
}

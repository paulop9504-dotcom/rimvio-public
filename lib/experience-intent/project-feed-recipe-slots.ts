import type { ExperienceIntent } from "@/lib/experience-intent/experience-intent-types";
import {
  FEED_RECIPE_MIN_CONFIDENCE,
  FEED_RECIPE_SLOT_EMOJI,
  FEED_RECIPE_SLOT_LABELS,
  feedRecipeForIntent,
  type FeedRecipe,
  type FeedRecipeSlotKind,
} from "@/lib/experience-intent/feed-recipe-registry";
import {
  readExperienceIntentFromEvent,
  resolveExperienceIntent,
} from "@/lib/experience-intent/resolve-experience-intent";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { FeedTimelineAggregate } from "@/lib/feed/feed-timeline-aggregate-types";
import type { FeedSlotPill } from "@/lib/feed/feed-slot-pill-types";
import type { FeedSlotPeerContext } from "@/lib/feed/feed-slot-peer-context-types";
import type { PlanContext } from "@/lib/plan-context/plan-context-types";

export type FeedRecipeSlotProjection = {
  kind: FeedRecipeSlotKind;
  label: string;
  emoji: string;
  summary: string | null;
  active: boolean;
};

export type FeedRecipeProjection = {
  intent: ExperienceIntent;
  confidence: number;
  recipe: FeedRecipe;
  slots: readonly [
    FeedRecipeSlotProjection,
    FeedRecipeSlotProjection,
    FeedRecipeSlotProjection,
    FeedRecipeSlotProjection,
  ];
};

export type FeedRecipeProjectionInput = {
  event: EventCandidate;
  plan?: PlanContext | null;
  peers?: readonly FeedSlotPeerContext[];
  timelineAggregate?: FeedTimelineAggregate | null;
  timeLabel?: string | null;
  prepLine?: string | null;
  placeLabel?: string | null;
  pills?: readonly FeedSlotPill[];
};

function uniquePeerNames(peers: readonly FeedSlotPeerContext[]): string[] {
  const names = new Set<string>();
  for (const peer of peers) {
    const name = peer.displayName?.trim();
    if (name) {
      names.add(name);
    }
  }
  return [...names];
}

function buildSlotSummary(
  kind: FeedRecipeSlotKind,
  input: FeedRecipeProjectionInput,
): { summary: string | null; active: boolean } {
  const peers = input.peers ?? [];
  const aggregate = input.timelineAggregate;
  const plan = input.plan;
  const event = input.event;
  const pills = input.pills ?? [];

  switch (kind) {
    case "people": {
      const names = uniquePeerNames(peers);
      const planName = plan?.peerDisplayName?.trim();
      if (names.length > 0) {
        const preview = names.slice(0, 3).join(" · ");
        const extra = names.length > 3 ? ` 외 ${names.length - 3}명` : "";
        return { summary: `${preview}${extra}`, active: true };
      }
      if (planName) {
        return { summary: planName, active: true };
      }
      const attendees = event.metadata?.attendees;
      if (Array.isArray(attendees) && attendees.length > 0) {
        const labels = attendees
          .filter((row): row is string => typeof row === "string")
          .slice(0, 3);
        return { summary: labels.join(" · "), active: true };
      }
      return { summary: null, active: false };
    }
    case "memory": {
      if (!aggregate?.hasContent) {
        return { summary: null, active: false };
      }
      const parts: string[] = [];
      if (aggregate.photos > 0) {
        parts.push(`사진 ${aggregate.photos}`);
      }
      if (aggregate.videos > 0) {
        parts.push(`영상 ${aggregate.videos}`);
      }
      if (aggregate.friendLabels.length > 0 && aggregate.photos === 0 && aggregate.videos === 0) {
        parts.push(aggregate.friendLabels.slice(0, 2).join(" · "));
      }
      return {
        summary: parts.length > 0 ? parts.join(" · ") : "기록 있음",
        active: true,
      };
    }
    case "mobility": {
      const parts: string[] = [];
      if (input.prepLine?.trim()) {
        parts.push(input.prepLine.trim());
      }
      if (aggregate?.dwellMinutes && aggregate.dwellMinutes > 0) {
        parts.push(`체류 ${aggregate.dwellMinutes}분`);
      }
      if (plan?.place?.trim()) {
        parts.push(`→ ${plan.place.trim()}`);
      }
      return {
        summary: parts.length > 0 ? parts.join(" · ") : null,
        active: parts.length > 0,
      };
    }
    case "prep": {
      const prepPills = pills
        .slice(0, 2)
        .map((pill) => pill.label);
      if (prepPills.length > 0) {
        return { summary: prepPills.join(" · "), active: true };
      }
      if (input.prepLine?.trim()) {
        return { summary: input.prepLine.trim(), active: true };
      }
      return { summary: null, active: false };
    }
    case "stay": {
      const nights = plan?.nights;
      const place = plan?.place?.trim() || event.place?.trim();
      const parts: string[] = [];
      if (nights && nights > 0) {
        parts.push(`${nights}박`);
      }
      if (place) {
        parts.push(place);
      }
      return {
        summary: parts.length > 0 ? parts.join(" · ") : null,
        active: parts.length > 0,
      };
    }
    case "place": {
      const place =
        input.placeLabel?.trim() ||
        plan?.place?.trim() ||
        event.place?.trim() ||
        null;
      return {
        summary: place,
        active: Boolean(place),
      };
    }
    case "schedule": {
      const label = input.timeLabel?.trim();
      return {
        summary: label ?? null,
        active: Boolean(label),
      };
    }
    case "documents": {
      if (!aggregate) {
        return { summary: null, active: false };
      }
      const parts: string[] = [];
      if (aggregate.links > 0) {
        parts.push(`링크 ${aggregate.links}`);
      }
      if (aggregate.memos > 0) {
        parts.push(`메모 ${aggregate.memos}`);
      }
      const docPills = pills
        .filter((pill) => pill.kind === "deeplink")
        .slice(0, 2)
        .map((pill) => pill.label);
      if (docPills.length > 0) {
        parts.push(...docPills);
      }
      return {
        summary: parts.length > 0 ? parts.join(" · ") : null,
        active: parts.length > 0,
      };
    }
    default:
      return { summary: null, active: false };
  }
}

function projectSlot(
  kind: FeedRecipeSlotKind,
  input: FeedRecipeProjectionInput,
): FeedRecipeSlotProjection {
  const { summary, active } = buildSlotSummary(kind, input);
  return {
    kind,
    label: FEED_RECIPE_SLOT_LABELS[kind],
    emoji: FEED_RECIPE_SLOT_EMOJI[kind],
    summary,
    active,
  };
}

function resolveIntentForProjection(
  event: EventCandidate,
): { intent: ExperienceIntent; confidence: number } {
  const stamped = readExperienceIntentFromEvent(event);
  if (stamped) {
    return { intent: stamped.intent, confidence: stamped.confidence };
  }
  const resolved = resolveExperienceIntent(event);
  return { intent: resolved.intent, confidence: resolved.confidence };
}

/** Pure read — intent recipe slots for FeedTodaySlotCard. */
export function projectFeedRecipeSlots(
  input: FeedRecipeProjectionInput,
): FeedRecipeProjection | null {
  const { intent, confidence } = resolveIntentForProjection(input.event);
  const recipe = feedRecipeForIntent(intent);
  if (!recipe || confidence < FEED_RECIPE_MIN_CONFIDENCE) {
    return null;
  }

  const slots = recipe.slots.map((kind) => projectSlot(kind, input)) as FeedRecipeProjection["slots"];

  return {
    intent,
    confidence,
    recipe,
    slots,
  };
}

export function shouldUseFeedRecipeLayout(
  projection: FeedRecipeProjection | null,
): projection is FeedRecipeProjection {
  return projection !== null;
}

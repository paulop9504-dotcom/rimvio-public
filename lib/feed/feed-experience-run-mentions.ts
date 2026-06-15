import { resolveMentionFeature } from "@/lib/event-kernel/action-contracts/mention-feature-registry";

/** Experience-scoped @ runs — Globe recall context → Search mention execution. */
export const FEED_EXPERIENCE_RUN_MENTIONS = [
  { featureId: "navigate", label: "길찾기" },
  { featureId: "meal", label: "맛집" },
] as const;

export type FeedExperienceRunFeatureId =
  (typeof FEED_EXPERIENCE_RUN_MENTIONS)[number]["featureId"];

export type SearchExperienceExecution = {
  eventId: string;
  featureId: string;
  place: string | null;
  headline: string | null;
};

export function resolveExperienceRunFeatureLabel(featureId: string): string {
  const row = FEED_EXPERIENCE_RUN_MENTIONS.find((item) => item.featureId === featureId);
  return row?.label ?? featureId;
}

export function resolveExperienceRunMentionTemplate(
  featureId: string,
): string | null {
  const feature = resolveMentionFeature(
    featureId === "navigate" ? "길찾기" : featureId === "meal" ? "맛집" : featureId,
  );
  if (!feature) {
    return null;
  }
  const token = feature.aliases[0] ?? feature.displayName;
  return `@${token} `;
}

export function buildExperienceMentionComposerText(input: {
  featureId: string;
  place?: string | null;
}): string {
  const template = resolveExperienceRunMentionTemplate(input.featureId);
  if (!template) {
    return `@${input.featureId} `;
  }
  const place = input.place?.trim();
  return place ? `${template}${place}` : template.trim();
}

export function buildExperienceRunSearchHref(input: {
  eventId: string;
  featureId: string;
  place?: string | null;
}): string {
  const params = new URLSearchParams();
  params.set("run", "mention");
  params.set("event", input.eventId.trim());
  params.set("feature", input.featureId.trim());
  const place = input.place?.trim();
  if (place) {
    params.set("place", place);
  }
  return `/search?${params.toString()}`;
}

export function parseExperienceRunSearchParams(
  params: URLSearchParams,
): {
  eventId: string;
  featureId: string;
  place: string | null;
} | null {
  if (params.get("run") !== "mention") {
    return null;
  }
  const eventId = params.get("event")?.trim();
  const featureId = params.get("feature")?.trim();
  if (!eventId || !featureId) {
    return null;
  }
  return {
    eventId,
    featureId,
    place: params.get("place")?.trim() || null,
  };
}

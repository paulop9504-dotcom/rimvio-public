import { parseRelativeDateTimeFromText } from "@/lib/action-chat/action-agent-normalize";
import { buildExtractedDataFromText } from "@/lib/action-chat/confirmation-logic";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import { resolvePluginDeeplink } from "@/lib/action-spawn/resolve-plugin-deeplink";
import {
  generateActionCandidatesSync,
  llmCandidatesToOverlayActions,
} from "@/lib/llm-action-candidate-generator";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import {
  isFutureScheduledDatetime,
  type ScheduledActionDelivery,
} from "@/lib/action-chat/scheduled-action-delivery";
import type { LinkActionItem } from "@/types/database";

const TRIP_ANNOUNCE =
  /(?:여행(?:간|감|가|을|을\s*)?|출장|해외(?:여행)?|trip|abroad)/iu;

const TRAVEL_DEST =
  /(?:오사카|제주|도쿄|후쿠오카|삿포로|교토|타이pei|타이베이|방콕|싱가포르|파리|런던|뉴욕|LA|인천공항|김포공항|공항)/iu;

const TIMED =
  /(?:\d{1,3}\s*시간\s*(?:뒤|후|뒤에|후에)|\d{1,3}\s*분\s*(?:뒤|후|뒤에|후에)|내일|모레)/iu;

export function isTravelTripAnnouncement(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) {
    return false;
  }
  const hasTrip = TRIP_ANNOUNCE.test(trimmed) || TRAVEL_DEST.test(trimmed);
  if (!hasTrip) {
    return false;
  }
  return TIMED.test(trimmed) || TRIP_ANNOUNCE.test(trimmed);
}

export function extractTravelDestination(message: string): string | null {
  const destMatch = message.match(
    /(?:오사카|제주|도쿄|후쿠오카|삿포로|교토|타이pei|타이베이|방콕|싱가포르|파리|런던|뉴욕|인천공항|김포공항)/iu,
  );
  if (destMatch?.[0]) {
    return destMatch[0].trim();
  }

  const toMatch = message.match(/([가-힣A-Za-z]{2,12})(?:로|으로)\s*(?:여행|출장|감|간|가)/iu);
  if (toMatch?.[1]) {
    return toMatch[1].trim();
  }

  if (TRAVEL_DEST.test(message)) {
    return message.match(TRAVEL_DEST)?.[0] ?? null;
  }

  return null;
}

/** @deprecated use event-commit-gate parseEventIntent */
export function isTravelDestinationAmbiguous(message: string): boolean {
  if (!isTravelTripAnnouncement(message)) {
    return false;
  }
  return extractTravelDestination(message) == null;
}

function overlayToLinkActions(  overlays: ReturnType<typeof llmCandidatesToOverlayActions>,
): LinkActionItem[] {
  return overlays.map((item) => {
    const href =
      item.deeplink ??
      resolvePluginDeeplink(item.plugin, { label: item.label }) ??
      "rimvio://chat/followup";

    return createOpenAction({
      label: item.label,
      href,
      icon: item.action_tier === "MAIN" ? "🎯" : "✨",
      payload: {
        plugin: item.plugin ?? undefined,
        action_tier: item.action_tier ?? "AUX",
      },
    });
  });
}

/**
 * "20시간 뒤 오사카 여행감" → travel prep actions (not DECISION A/B/C).
 */
export function tryTravelTripAnnouncement(input: {
  message: string;
  referenceDate?: string;
}): OrchestratorResult | null {
  const message = input.message.trim();
  if (!isTravelTripAnnouncement(message)) {
    return null;
  }

  const referenceDate = input.referenceDate ?? new Date().toISOString().slice(0, 10);
  const destination = extractTravelDestination(message);
  const datetime = parseRelativeDateTimeFromText(message, referenceDate);
  const extracted = buildExtractedDataFromText(message, referenceDate);

  const minutesUntil =
    datetime != null
      ? Math.max(0, Math.round((new Date(datetime).getTime() - Date.now()) / 60_000))
      : null;

  const ecId = `trip-${destination ?? "travel"}-${Date.now()}`;
  const candidateResult = generateActionCandidatesSync(ecId, {
    title: destination ? `${destination} 여행` : message,
    location: destination,
    minutes_until_event: minutesUntil,
    message,
  });

  const overlays = llmCandidatesToOverlayActions(
    candidateResult.candidates,
    destination,
  );

  if (overlays.length === 0) {
    return null;
  }

  const actions = overlayToLinkActions(overlays);
  const destLabel = destination ?? "여행";
  const timeHint =
    minutesUntil != null && minutesUntil <= 48 * 60
      ? ` **${Math.round(minutesUntil / 60)}시간 뒤**`
      : datetime
        ? ` **${datetime.slice(0, 16).replace("T", " ")}**`
        : "";

  const resolvedDatetime = datetime ?? extracted.datetime;
  const scheduleExtract = {
    ...extracted,
    place_name: destination ?? extracted.place_name,
    datetime: resolvedDatetime,
    title: `${destLabel} 여행`,
  };

  const scheduledDelivery: ScheduledActionDelivery | undefined =
    resolvedDatetime && isFutureScheduledDatetime(resolvedDatetime)
      ? { fire_at: resolvedDatetime, status: "pending" }
      : undefined;

  return {
    summary: `**${destLabel} 여행**${timeHint}으로 잡았어요. 준비부터 볼게요.`,
    actions,
    source: "rules",
    confidence: 0.9,
    disclosure: "high",
    actionsRevealed: true,
    pendingConfirm: false,
    scheduleExtract,
    scheduledDelivery,
    metadata: {
      intent: "SCHEDULE",
      trust_level_adjustment: "NONE",
      ai_intent: undefined,
      semantic_reason: "travel_trip_announcement",
    },
  };
}

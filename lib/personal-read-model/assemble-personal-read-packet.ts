import type { PinScope } from "@/lib/globe/pin-entity";
import { findLifeEventCandidate, readLifeProjections, readSurface } from "@/lib/life-read-model";
import { formatDateKey } from "@/lib/schedule/day-schedule";
import { mapActionSlice } from "@/lib/personal-read-model/map-action-slice";
import { mapExperienceSlice, resolveActiveHubKinds } from "@/lib/personal-read-model/map-experience-slice";
import { mapFactSlice } from "@/lib/personal-read-model/map-fact-slice";
import { mapGateSlice } from "@/lib/personal-read-model/map-gate-slice";
import { mapMeaningSlice } from "@/lib/personal-read-model/map-meaning-slice";
import { mapRecallSlice } from "@/lib/personal-read-model/map-recall-slice";
import { resolveReadScopeAi } from "@/lib/personal-read-model/resolve-read-scope-ai";
import type {
  PersonalReadPacket,
  PersonalReadScope,
} from "@/lib/personal-read-model/types";
import type { TrustStaircaseStage } from "@/lib/preferences/action-trust";
import type { LinkRow } from "@/types/database";

export type AssemblePersonalReadInput = {
  scope?: PersonalReadScope;
  userId?: string | null;
  dateKey?: string;
  now?: Date;
  activeContextId?: string | null;
  activeLink?: LinkRow | null;
  trustLevel?: TrustStaircaseStage;
  pinScope?: PinScope;
  location?: {
    lat: number | null;
    lng: number | null;
    label: string | null;
    spatialMode: "unknown" | "nearby_query" | "here_query";
  } | null;
  bypassCache?: boolean;
};

let cache: { key: string; packet: PersonalReadPacket; expiresAt: number } | null = null;

function cacheKey(input: AssemblePersonalReadInput, dateKey: string): string {
  return [
    input.scope ?? "client",
    dateKey,
    input.activeContextId ?? "",
    input.activeLink?.id ?? "",
    input.pinScope ?? "internal",
  ].join("|");
}

/** Merge life-read-model projections into one AI-ready packet. Read-only — never writes SSOT. */
export function assemblePersonalReadPacket(
  input: AssemblePersonalReadInput = {},
): PersonalReadPacket {
  const now = input.now ?? new Date();
  const dateKey = input.dateKey ?? formatDateKey(now);
  const scope = input.scope ?? "client";
  const trustLevel = input.trustLevel ?? 2;

  if (!input.bypassCache && typeof window !== "undefined") {
    const key = cacheKey(input, dateKey);
    if (cache && cache.key === key && cache.expiresAt > Date.now()) {
      return cache.packet;
    }
  }

  const life = readLifeProjections({ dateKey });
  const focusEvent = input.activeContextId
    ? findLifeEventCandidate(input.activeContextId)
    : null;

  const surface = readSurface({
    dateKey,
    timelineContext: { focusedEcId: focusEvent?.id ?? null, now },
    dockContext: { focusedEcId: focusEvent?.id ?? null, now },
    narrationContext: { focusedEcId: focusEvent?.id ?? null, now },
    behaviorContext: { focusedEcId: focusEvent?.id ?? null, now },
    opportunityContext: { focusedEcId: focusEvent?.id ?? null, now },
  });

  const contextFilter =
    focusEvent?.place?.trim() ||
    focusEvent?.title?.trim() ||
    input.activeLink?.category ||
    null;

  const packet: PersonalReadPacket = {
    meta: {
      assembledAt: now.toISOString(),
      scope,
      dateKey,
      userId: input.userId ?? null,
      scopeAi: resolveReadScopeAi(input.pinScope ?? "internal"),
      activeContextId: focusEvent?.id ?? null,
      activeContextTitle: focusEvent?.title?.trim() ?? null,
      location: input.location ?? null,
      activeHubKinds: resolveActiveHubKinds(focusEvent),
      trustLevel,
    },
    fact: mapFactSlice({ life, activeLink: input.activeLink }),
    experience: mapExperienceSlice({ focusEvent, surface }),
    meaning: mapMeaningSlice({
      events: life.events,
      now,
      contextFilter,
    }),
    recall: mapRecallSlice({ life, focusEvent, now }),
    action: mapActionSlice({ focusEvent, surface }),
    gates: mapGateSlice({
      activeLink: input.activeLink,
      trustLevel,
      pinScope: input.pinScope,
    }),
  };

  if (!input.bypassCache && typeof window !== "undefined") {
    cache = {
      key: cacheKey(input, dateKey),
      packet,
      expiresAt: Date.now() + 30_000,
    };
  }

  return packet;
}

export function clearPersonalReadPacketCacheForTests(): void {
  cache = null;
}

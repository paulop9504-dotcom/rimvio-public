/**
 * Universal Pin — spatial read model (projection).
 * Truth SSOT remains EventCandidate. @see docs/RFC_UNIVERSAL_PIN_SYSTEM.md
 */

import type { PinDomainId } from "@/lib/globe/pin-domain-registry";

/** internal = personal trace (P1 default). external = shared discovery (Phase 2). */
export type PinScope = "internal" | "external";

export type PinLocation = {
  lat: number;
  lng: number;
  placeLabel: string;
};

export type PinAuthor = {
  userId?: string | null;
  displayName?: string | null;
};

export type PinMediaCounts = {
  photoCount: number;
  videoCount: number;
};

/** Unified globe / feed spatial node — always linked to truth via eventId. */
export type PinEntity = {
  id: string;
  eventId: string;
  domainId: PinDomainId;
  scope: PinScope;
  title: string;
  content: string | null;
  location: PinLocation;
  author: PinAuthor;
  media: PinMediaCounts;
  createdAtIso: string;
  startedAtIso: string | null;
  /** Domain registry slot payload (price, rent, …). */
  slots: Readonly<Record<string, unknown>>;
  recallLine: string | null;
};

/** EventCandidate.metadata keys for universal pin. */
export const PIN_DOMAIN_META_KEY = "pinDomainId" as const;
export const PIN_INFERRED_DOMAIN_META_KEY = "pinInferredDomainId" as const;
export const PIN_SLOTS_META_KEY = "pinSlots" as const;

export function isPinScope(value: unknown): value is PinScope {
  return value === "internal" || value === "external";
}

/**
 * Pin domain plugins — verticals are interpretations, not separate apps.
 * Product phases P1–P5: docs/RFC_UNIVERSAL_PIN_SYSTEM.md
 */

/** Current product ship phase — bump when activating the next domain/scope. */
export const PIN_DOMAIN_SHIP_PHASE = 3 as const;

export type PinProductPhase = 1 | 2 | 3 | 4 | 5;

export type PinDomainPhase = "active" | "stub";

export type PinDomainId =
  | "experience"
  | "market"
  | "property"
  | "gathering"
  | "service"
  | "job";

/** @deprecated P1–P2 — trip legs use experience + trip metadata, not a domain phase. */
export type PinDomainOverlayId = "travel";

export type PinDomainDefinition = {
  id: PinDomainId;
  labelKo: string;
  phase: PinDomainPhase;
  /** When this domain may commit as pinDomainId (not scope). */
  activatesAtPhase: PinProductPhase;
  slotSchemaVersion: string;
  defaultScope: "internal" | "external";
};

const REGISTRY: readonly PinDomainDefinition[] = [
  {
    id: "experience",
    labelKo: "경험",
    phase: "active",
    activatesAtPhase: 1,
    slotSchemaVersion: "experience.v1",
    defaultScope: "internal",
  },
  {
    id: "gathering",
    labelKo: "모임",
    phase: "active",
    activatesAtPhase: 3,
    slotSchemaVersion: "gathering.v1",
    defaultScope: "external",
  },
  {
    id: "market",
    labelKo: "중고",
    phase: "stub",
    activatesAtPhase: 4,
    slotSchemaVersion: "market.v1",
    defaultScope: "external",
  },
  {
    id: "service",
    labelKo: "서비스",
    phase: "stub",
    activatesAtPhase: 5,
    slotSchemaVersion: "service.v1",
    defaultScope: "external",
  },
  {
    id: "property",
    labelKo: "부동산",
    phase: "stub",
    activatesAtPhase: 5,
    slotSchemaVersion: "property.v1",
    defaultScope: "external",
  },
  {
    id: "job",
    labelKo: "구인·구직",
    phase: "stub",
    activatesAtPhase: 5,
    slotSchemaVersion: "job.v1",
    defaultScope: "external",
  },
] as const;

const BY_ID = new Map(REGISTRY.map((row) => [row.id, row]));

/** Inferred-only overlays — never commit as pinDomainId. */
export const PIN_DOMAIN_OVERLAY_IDS = ["travel"] as const satisfies readonly PinDomainOverlayId[];

export function listPinDomains(): readonly PinDomainDefinition[] {
  return REGISTRY;
}

export function getPinDomain(id: PinDomainId): PinDomainDefinition {
  const row = BY_ID.get(id);
  if (!row) {
    throw new Error(`unknown_pin_domain:${id}`);
  }
  return row;
}

export function isPinDomainId(value: unknown): value is PinDomainId {
  return typeof value === "string" && BY_ID.has(value as PinDomainId);
}

export function isPinDomainOverlayId(value: unknown): value is PinDomainOverlayId {
  return value === "travel";
}

/**
 * Domain stored on commit — gated by registry phase + PIN_DOMAIN_SHIP_PHASE.
 * P1–P2: always experience. P3+: gathering, P4+: market, P5+: service/property/job.
 */
export function resolveActivePinDomainId(
  inferred: PinDomainId | PinDomainOverlayId,
  shipPhase: PinProductPhase = PIN_DOMAIN_SHIP_PHASE,
): PinDomainId {
  if (inferred === "travel" || isPinDomainOverlayId(inferred)) {
    return "experience";
  }
  const def = getPinDomain(inferred);
  if (def.phase !== "active" || def.activatesAtPhase > shipPhase) {
    return "experience";
  }
  return def.id;
}

export const PIN_DOMAIN_ACTIVE_DEFAULT: PinDomainId = "experience";

/**
 * Scope gate — separate from domain.
 * P1: internal only · P2+: external read/write opens for shared traces.
 * Doctrine + orchestrator persona: `lib/scope-ai/` · `docs/RIMVIO_SCOPE_AI.md`
 */
export function resolveActivePinScope(
  requested: "internal" | "external",
  shipPhase: PinProductPhase = PIN_DOMAIN_SHIP_PHASE,
): "internal" | "external" {
  if (requested === "external" && shipPhase < 2) {
    return "internal";
  }
  return requested;
}

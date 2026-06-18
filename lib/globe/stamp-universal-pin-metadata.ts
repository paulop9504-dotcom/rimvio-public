/**
 * Stamp universal pin keys on EventCandidate.metadata at commit time.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import { classifyPinDomainFromText } from "@/lib/globe/classify-pin-domain";
import {
  getPinDomain,
  PIN_DOMAIN_ACTIVE_DEFAULT,
  isPinDomainId,
  resolveActivePinDomainId,
  resolveActivePinScope,
  type PinDomainId,
} from "@/lib/globe/pin-domain-registry";
import { stampPinLineageParent } from "@/lib/globe/pin-lineage-metadata";
import {
  GLOBE_CONTEXT_VISIBILITY_EXTERNAL,
  GLOBE_CONTEXT_VISIBILITY_PRIVATE,
  defaultGlobeContextVisibilityMetadata,
} from "@/lib/globe/globe-context-visibility";
import {
  PIN_DOMAIN_META_KEY,
  PIN_INFERRED_DOMAIN_META_KEY,
  PIN_SLOTS_META_KEY,
  type PinScope,
} from "@/lib/globe/pin-entity";

export type StampUniversalPinInput = {
  metadata?: Record<string, unknown> | null;
  sourceText?: string | null;
  domainId?: PinDomainId;
  inferredDomainId?: PinDomainId | null;
  slots?: Record<string, unknown>;
  scope?: PinScope;
  lineageParentEventId?: string | null;
};

export function readPinDomainId(
  metadata: Record<string, unknown> | null | undefined,
): PinDomainId {
  const raw = metadata?.[PIN_DOMAIN_META_KEY];
  return isPinDomainId(raw) ? raw : PIN_DOMAIN_ACTIVE_DEFAULT;
}

export function readPinInferredDomainId(
  metadata: Record<string, unknown> | null | undefined,
): PinDomainId | null {
  const raw = metadata?.[PIN_INFERRED_DOMAIN_META_KEY];
  return isPinDomainId(raw) ? raw : null;
}

export function readPinSlots(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const raw = metadata?.[PIN_SLOTS_META_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return { ...(raw as Record<string, unknown>) };
}

export function readPinScopeFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): PinScope {
  const visibility = metadata?.globeContextVisibility;
  return visibility === "external" ? "external" : "internal";
}

/** Merge pin domain metadata — does not replace unrelated event keys. */
export function stampUniversalPinMetadata(
  input: StampUniversalPinInput,
): Record<string, unknown> {
  const base = { ...(input.metadata ?? {}) };
  const classification = input.sourceText?.trim()
    ? classifyPinDomainFromText(input.sourceText)
    : null;

  const domainId =
    input.domainId ??
    (classification
      ? resolveActivePinDomainId(
          classification.inferredDomainId ?? classification.domainId,
        )
      : readPinDomainId(base));

  const inferredDomainId =
    input.inferredDomainId !== undefined
      ? input.inferredDomainId
      : classification?.inferredDomainId ?? readPinInferredDomainId(base);

  const slots = {
    ...readPinSlots(base),
    ...(classification?.slots ?? {}),
    ...(input.slots ?? {}),
  };

  const scope = resolveActivePinScope(
    input.scope ??
      (classification && classification.domainId === domainId && domainId !== "experience"
        ? getPinDomain(domainId).defaultScope
        : readPinScopeFromMetadata(base)),
  );

  let metadata = {
    ...base,
    ...defaultGlobeContextVisibilityMetadata(),
    [PIN_DOMAIN_META_KEY]: domainId,
    ...(inferredDomainId ? { [PIN_INFERRED_DOMAIN_META_KEY]: inferredDomainId } : {}),
    ...(Object.keys(slots).length > 0 ? { [PIN_SLOTS_META_KEY]: slots } : {}),
    globeContextVisibility:
      scope === "external"
        ? GLOBE_CONTEXT_VISIBILITY_EXTERNAL
        : GLOBE_CONTEXT_VISIBILITY_PRIVATE,
  };

  metadata = stampPinLineageParent(metadata, input.lineageParentEventId);

  return metadata;
}

/** Ensure event carries universal pin metadata (idempotent). */
export function ensureUniversalPinOnEvent(
  event: EventCandidate,
  sourceText?: string | null,
): EventCandidate {
  if (event.metadata?.[PIN_DOMAIN_META_KEY] && !sourceText?.trim()) {
    return event;
  }
  return {
    ...event,
    metadata: stampUniversalPinMetadata({
      metadata: event.metadata,
      sourceText,
    }),
  };
}

/**
 * Pin scope resolution — phase gate + doctrine entry.
 * Delegates ship-phase gate to pin-domain-registry.
 */

import {
  resolveActivePinScope,
  type PinProductPhase,
} from "@/lib/globe/pin-domain-registry";
import type { PinScope } from "@/lib/globe/pin-entity";
import { isPinScope } from "@/lib/globe/pin-entity";

/** Doctrine-aware scope gate (wraps `resolveActivePinScope`). */
export function resolvePinScope(
  requested: PinScope,
  shipPhase?: PinProductPhase,
): PinScope {
  return resolveActivePinScope(requested, shipPhase);
}

export function readPinScopeHint(value: unknown): PinScope | null {
  return isPinScope(value) ? resolvePinScope(value) : null;
}

const COMPOSER_SCOPE_LINE = /pin_scope:\s*(internal|external)/iu;

export function readPinScopeFromComposerContext(
  composerContext: string | null | undefined,
): PinScope | null {
  const raw = composerContext?.trim();
  if (!raw) {
    return null;
  }
  const match = raw.match(COMPOSER_SCOPE_LINE);
  if (!match?.[1]) {
    return null;
  }
  return readPinScopeHint(match[1].toLowerCase());
}

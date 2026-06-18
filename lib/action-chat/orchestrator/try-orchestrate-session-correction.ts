import { actionIntentToMasterWire } from "@/lib/action-dispatcher/action-intent-to-master-wire";
import { normalizeMasterOrchestratorWire } from "@/lib/action-chat/normalize-master-result";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { detectFrustrationEscape } from "@/lib/action-chat/adaptive-behavior/ux-guards/frustration-circuit-breaker";
import {
  applySessionIntentCorrection,
  commitSessionIntent,
  extractCorrectionTarget,
  getSessionIntent,
  isCorrectionMessage,
  sessionIntentToActionIntent,
} from "@/lib/action-os/session-intent-state";

const NAVIGABLE_CORRECTION_TARGET =
  /(?:역|동|구|시|군|읍|면|리|로|길|공항|맛집|카페|식당|병원|학교|주차|터미널)/iu;

function isNavigableCorrectionTarget(target: string | null): boolean {
  if (!target || target.length < 2) {
    return false;
  }
  if (/^(?:그게\s*아니|아니고)$/iu.test(target.trim())) {
    return false;
  }
  return NAVIGABLE_CORRECTION_TARGET.test(target);
}

/** Phase 1 · Tier 2 — session intent correction → operable NAVIGATE (etc.). */
export function tryOrchestrateSessionCorrection(input: {
  message: string;
  scopeId?: string;
  existingSchedule?: Array<{ time: string; task: string }>;
}): OrchestratorResult | null {
  const message = input.message.trim();
  if (!message || !isCorrectionMessage(message)) {
    return null;
  }

  const scopeId = input.scopeId ?? "default";
  const previous = getSessionIntent(scopeId);

  if (detectFrustrationEscape(message) && !previous) {
    const target = extractCorrectionTarget(message);
    if (!isNavigableCorrectionTarget(target)) {
      return null;
    }
  }
  const corrected = applySessionIntentCorrection({ message, previous });

  if (corrected) {
    commitSessionIntent(corrected, scopeId);
    const wire = actionIntentToMasterWire(sessionIntentToActionIntent(corrected));
    return normalizeMasterOrchestratorWire({
      wire,
      source: "rules",
      existingSchedule: input.existingSchedule ?? [],
    });
  }

  const target = extractCorrectionTarget(message);
  if (target && !previous && isNavigableCorrectionTarget(target)) {
    const wire = actionIntentToMasterWire({
      action_id: "NAVIGATE",
      params: { dest: target },
      fallback_url: "https://map.naver.com",
      thought: `Correction without prior session — new intent dest='${target}'.`,
    });
    commitSessionIntent(
      {
        action_id: "NAVIGATE",
        params: { dest: target },
        fallback_url: "https://map.naver.com",
        updatedAt: new Date().toISOString(),
      },
      scopeId
    );
    return normalizeMasterOrchestratorWire({
      wire,
      source: "rules",
      existingSchedule: input.existingSchedule ?? [],
    });
  }

  return null;
}

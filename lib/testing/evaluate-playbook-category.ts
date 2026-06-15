import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { resolveAssistantDisplaySummary } from "@/lib/action-chat/resolve-assistant-display-summary";
import { orchestrateEntityQuickPick } from "@/lib/context-resolver/discovery/orchestrate-entity-quick-pick";
import { parseFindPlaceIntent } from "@/lib/context-resolver/discovery/parse-find-place-intent";
import { assertCafeDiscoveryDiversity } from "@/lib/context-resolver/places/filter-cafe-candidates";
import { buildEntityActionSurface } from "@/lib/event-kernel/entity/entity-action-surface";
import { isVitalityStateUtterance } from "@/lib/vitality-state/classify-vitality-state-intent";
import type { PlaybookCategoryId } from "@/lib/testing/routing-playbook-banks";

export const GENERIC_CLARIFY = "무엇을 도와드릴까요?";

export type PlaybookCheckResult = {
  category: PlaybookCategoryId;
  message: string;
  ok: boolean;
  detail?: string;
};

function hasStructuredResponse(result: OrchestratorResult): boolean {
  return Boolean(
    result.experienceChoice ||
      result.entityQuickPick ||
      result.cafeDiscovery ||
      (result.actions?.length ?? 0) > 0 ||
      result.presentation?.mode
  );
}

function isGenericOnly(result: OrchestratorResult): boolean {
  const summary = result.summary?.trim() ?? "";
  return summary === GENERIC_CLARIFY && !hasStructuredResponse(result);
}

/** Evaluate one playbook category for a message + pipeline result. */
export function evaluatePlaybookCategory(
  category: PlaybookCategoryId,
  message: string,
  result: OrchestratorResult
): PlaybookCheckResult {
  const summary = result.summary ?? "";

  switch (category) {
    case 1: {
      const ok = !isGenericOnly(result);
      return {
        category,
        message,
        ok,
        detail: ok ? undefined : `generic only: ${summary.slice(0, 50)}`,
      };
    }
    case 2: {
      const quick = orchestrateEntityQuickPick(message);
      const badLead = /관련해서 많이 찾는 정보/.test(summary) && isVitalityStateUtterance(message);
      const ok = quick === null && !badLead;
      return {
        category,
        message,
        ok,
        detail: ok ? undefined : "vitality treated as entity quick pick",
      };
    }
    case 3: {
      const parsed = parseFindPlaceIntent(message);
      const cafeNames = result.cafeDiscovery?.options?.map((option) => option.name) ?? [];
      const diversity =
        cafeNames.length > 0
          ? assertCafeDiscoveryDiversity(cafeNames, message)
          : { ok: true as const };
      const ok =
        (parsed !== null ||
          Boolean(result.cafeDiscovery) ||
          /맛집|식당|찾|추천|먹|카페/i.test(summary)) &&
        diversity.ok;
      return {
        category,
        message,
        ok,
        detail: ok
          ? undefined
          : diversity.ok
            ? "meal/place not discovered"
            : diversity.reason,
      };
    }
    case 4: {
      const gated = isVitalityStateUtterance(message);
      const ok = gated && !isGenericOnly(result);
      return {
        category,
        message,
        ok,
        detail: ok ? undefined : gated ? "vitality generic fallback" : "vitality gate miss",
      };
    }
    case 5: {
      const surface = buildEntityActionSurface(message);
      const ok =
        Boolean(surface || result.entityQuickPick) &&
        !isVitalityStateUtterance(message);
      return {
        category,
        message,
        ok,
        detail: ok ? undefined : "entity surface missing for brand",
      };
    }
    case 6: {
      const ok = !isGenericOnly(result);
      return {
        category,
        message,
        ok,
        detail: ok ? undefined : "rules path returned generic",
      };
    }
    case 7: {
      const display = resolveAssistantDisplaySummary({
        summary: result.summary,
        experienceChoice: result.experienceChoice,
        entityQuickPick: result.entityQuickPick,
        cafeDiscovery: result.cafeDiscovery,
      });
      const ok = display !== GENERIC_CLARIFY || hasStructuredResponse(result);
      return {
        category,
        message,
        ok,
        detail: ok ? undefined : `UI would show greeting; display=${display.slice(0, 40)}`,
      };
    }
    case 8: {
      const ok = !isGenericOnly(result);
      return {
        category,
        message,
        ok,
        detail: ok ? undefined : "regression generic fallback",
      };
    }
    case 9: {
      const ok = !isGenericOnly(result);
      return {
        category,
        message,
        ok,
        detail: ok ? undefined : `mixed colloquial failed: ${summary.slice(0, 40)}`,
      };
    }
    case 10: {
      const ok = !isGenericOnly(result) && hasStructuredResponse(result);
      return {
        category,
        message,
        ok,
        detail: ok ? undefined : `stress case weak: ${summary.slice(0, 50)}`,
      };
    }
    default:
      return { category, message, ok: false, detail: "unknown category" };
  }
}

export function formatCheckFailure(check: PlaybookCheckResult): string {
  return `#${check.category} "${check.message}" — ${check.detail ?? "fail"}`;
}

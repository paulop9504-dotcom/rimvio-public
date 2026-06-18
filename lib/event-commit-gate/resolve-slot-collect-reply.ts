import {
  mergeOrchestratorMetadata,
  type OrchestrateHistoryTurn,
  type OrchestratorResult,
} from "@/lib/action-chat/orchestrator-types";
import type { GoalPriorityHint, GoalSnapshot } from "@/lib/goal-engine/types";
import { orchestrateContextualMealRecommendation } from "@/lib/event-os/contextual-recommendation/orchestrate-contextual-meal";
import {
  extractKoreanAreaFromText,
  isKoreanAreaToken,
} from "@/lib/event-commit-gate/parse-korean-area";
import { buildAreaDisambiguationOrchestratorResult } from "@/lib/event-commit-gate/build-area-disambiguation-result";
import { resolveKoreanAreaPhrase } from "@/lib/event-commit-gate/resolve-korean-area-phrase";
import type { CommitSlotName, EventIntentKind } from "@/lib/event-commit-gate/types";
import type { LocationMemoryWire } from "@/lib/location-memory/types";

export type PendingSlotCollect = {
  intent: EventIntentKind;
  primaryMissing: CommitSlotName;
  seedMessage: string;
};

const SLOT_QUESTION_MARKERS: Array<{
  pattern: RegExp;
  intent: EventIntentKind;
  primaryMissing: CommitSlotName;
}> = [
  {
    pattern: /지역·메뉴·분위기/iu,
    intent: "meal",
    primaryMissing: "target",
  },
  {
    pattern: /어느\s*동네/iu,
    intent: "meal",
    primaryMissing: "location",
  },
  {
    pattern: /전국에 같은 이름/iu,
    intent: "meal",
    primaryMissing: "location",
  },
  {
    pattern: /목적지를\s*알려주세요/iu,
    intent: "navigate",
    primaryMissing: "location",
  },
];

const MEAL_TARGET_REPLY =
  /^(?:지역|메뉴|분위기)(?:\s*기준|\s*으로|\s*쪽)?\.?$/iu;

function recentUserBeforeAssistant(
  history: readonly OrchestrateHistoryTurn[],
  assistantIndex: number,
): string | null {
  for (let i = assistantIndex - 1; i >= 0; i -= 1) {
    const turn = history[i];
    if (turn.role === "user" && turn.content.trim()) {
      return turn.content.trim();
    }
  }
  return null;
}

export function findPendingSlotCollect(
  history: readonly OrchestrateHistoryTurn[] | undefined,
): PendingSlotCollect | null {
  if (!history?.length) {
    return null;
  }

  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i];
    if (turn.role !== "assistant") {
      continue;
    }

    for (const marker of SLOT_QUESTION_MARKERS) {
      if (marker.pattern.test(turn.content)) {
        const seedMessage = recentUserBeforeAssistant(history, i);
        if (!seedMessage) {
          return null;
        }
        return {
          intent: marker.intent,
          primaryMissing: marker.primaryMissing,
          seedMessage,
        };
      }
    }
    break;
  }

  return null;
}

function parseMealTargetAxis(message: string): "region" | "menu" | "mood" | null {
  const trimmed = message.trim();
  if (/^지역/iu.test(trimmed)) {
    return "region";
  }
  if (/^메뉴/iu.test(trimmed)) {
    return "menu";
  }
  if (/^분위기/iu.test(trimmed)) {
    return "mood";
  }
  return null;
}

function buildMealAxisMessage(seed: string, axis: "region" | "menu" | "mood"): string {
  const axisLabel =
    axis === "region" ? "지역" : axis === "menu" ? "메뉴" : "분위기";
  return `${seed} ${axisLabel} 기준`;
}

export function isSlotCollectReply(
  message: string,
  history?: readonly OrchestrateHistoryTurn[],
): boolean {
  const pending = findPendingSlotCollect(history);
  if (!pending) {
    return false;
  }

  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 24) {
    return false;
  }

  if (pending.intent === "meal" && pending.primaryMissing === "target") {
    return Boolean(parseMealTargetAxis(trimmed));
  }

  if (pending.intent === "navigate" && pending.primaryMissing === "location") {
    return trimmed.length >= 2;
  }

  if (pending.intent === "meal" && pending.primaryMissing === "location") {
    if (/[가-힣]{2,8}구\s+[가-힣]{2,12}동/u.test(trimmed)) {
      return true;
    }
    return isKoreanAreaToken(trimmed) || (trimmed.length >= 2 && trimmed.length <= 24);
  }

  return false;
}

function findMealSeedFromHistory(
  history: readonly OrchestrateHistoryTurn[] | undefined,
): string | null {
  if (!history?.length) {
    return null;
  }
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i];
    if (turn.role !== "user") {
      continue;
    }
    if (/(?:배고|먹|맛집|식사|메뉴|점심|저녁)/iu.test(turn.content)) {
      return turn.content.trim();
    }
  }
  return null;
}

function recentSearchQueries(
  locationMemory?: LocationMemoryWire | null,
): string[] {
  return (locationMemory?.recentActivities ?? [])
    .map((row) => row.query)
    .filter(Boolean)
    .slice(-5);
}

export async function orchestrateSlotCollectContinuation(input: {
  message: string;
  history?: OrchestrateHistoryTurn[];
  locationMemory?: LocationMemoryWire | null;
  goalSnapshot?: GoalSnapshot | null;
  goalPriorityHint?: GoalPriorityHint | null;
}): Promise<OrchestratorResult | null> {
  const pending = findPendingSlotCollect(input.history);
  if (!pending) {
    return null;
  }

  const trimmed = input.message.trim();
  if (!trimmed) {
    return null;
  }

  if (pending.intent === "meal" && pending.primaryMissing === "target") {
    const axis = parseMealTargetAxis(trimmed);
    if (!axis) {
      return null;
    }

    if (axis === "region") {
      const areaMatch = pending.seedMessage.match(
        /([가-힣A-Za-z0-9]{2,12}(?:동|역|구|시|읍|면|리))/u,
      );
      const merged = areaMatch
        ? `${pending.seedMessage} ${areaMatch[1]!} 근처`
        : buildMealAxisMessage(pending.seedMessage, axis);

      if (!areaMatch) {
        return {
          summary:
            "**지역** 기준이시네요. **어느 동네** 쪽으로 볼까요? 동·역·구 이름만 말해 주세요.",
          actions: [],
          source: "rules",
          confidence: 0.86,
          disclosure: "medium",
          actionsRevealed: false,
          pendingConfirm: false,
          metadata: mergeOrchestratorMetadata(undefined, {
            intent: "ACTION",
            trust_level_adjustment: "NONE",
            semantic_reason: "commit_gate_slot_collect",
            event_intent: "meal",
            missing_slots: ["location"],
            primary_missing: "location",
            meal_target_axis: axis,
            slot_reply_seed: pending.seedMessage,
          }),
        };
      }

      const meal = orchestrateContextualMealRecommendation({
        message: merged,
        history: input.history,
        goalSnapshot: input.goalSnapshot,
        goalPriorityHint: input.goalPriorityHint,
      });
      if (meal) {
        return {
          ...meal.orchestrator,
          summary: `**${areaMatch[1]}** 근처로 골라봤어요.\n\n${meal.orchestrator.summary}`,
          metadata: mergeOrchestratorMetadata(meal.orchestrator.metadata, {
            semantic_reason: "commit_gate_slot_filled",
            event_intent: "meal",
            meal_target_axis: axis,
          }),
        };
      }
    }

    const merged = buildMealAxisMessage(pending.seedMessage, axis);
    const meal = orchestrateContextualMealRecommendation({
      message: merged,
      history: input.history,
      goalSnapshot: input.goalSnapshot,
      goalPriorityHint: input.goalPriorityHint,
    });
    if (!meal) {
      return {
        summary:
          axis === "menu"
            ? "**메뉴** 기준으로 볼게요. 어떤 종류가 끌리세요? (한식·일식·양식 등)"
            : "**분위기** 기준으로 볼게요. 조용한 곳·활기찬 곳 중 어떤 쪽이 좋으세요?",
        actions: [],
        source: "rules",
        confidence: 0.84,
        disclosure: "medium",
        actionsRevealed: false,
        pendingConfirm: false,
        metadata: mergeOrchestratorMetadata(undefined, {
          intent: "ACTION",
          trust_level_adjustment: "NONE",
          semantic_reason: "commit_gate_slot_filled",
          event_intent: "meal",
          meal_target_axis: axis,
        }),
      };
    }

    const axisLabel =
      axis === "region" ? "지역" : axis === "menu" ? "메뉴" : "분위기";
    return {
      ...meal.orchestrator,
      summary: `**${axisLabel}** 기준으로 골라봤어요.\n\n${meal.orchestrator.summary}`,
      metadata: mergeOrchestratorMetadata(meal.orchestrator.metadata, {
        semantic_reason: "commit_gate_slot_filled",
        event_intent: "meal",
        meal_target_axis: axis,
      }),
    };
  }

  if (pending.intent === "meal" && pending.primaryMissing === "location") {
    const resolved = resolveKoreanAreaPhrase({
      message: trimmed,
      lifeZoneLabel: input.locationMemory?.lifeZone?.label ?? null,
      recentSearchQueries: recentSearchQueries(input.locationMemory),
    });

    if (resolved.needsBroaderContext) {
      const disambiguation = await buildAreaDisambiguationOrchestratorResult({
        areaToken: resolved.area,
        seedMessage: pending.seedMessage,
      });
      return {
        ...disambiguation,
        metadata: mergeOrchestratorMetadata(disambiguation.metadata, {
          semantic_reason: "commit_gate_area_disambiguation",
          event_intent: "meal",
          missing_slots: ["location"],
          primary_missing: "location",
          meal_target_axis: "region",
          location_needs_disambiguation: true,
          slot_reply_seed: pending.seedMessage,
        }),
      };
    }

    const mealSeed = findMealSeedFromHistory(input.history) ?? pending.seedMessage;
    const merged = `${mealSeed} ${resolved.searchQuery} 맛집 추천`;
    const meal = orchestrateContextualMealRecommendation({
      message: merged,
      history: input.history,
      goalSnapshot: input.goalSnapshot,
      goalPriorityHint: input.goalPriorityHint,
    });
    if (meal) {
      return {
        ...meal.orchestrator,
        summary: `**${resolved.searchQuery}** 쪽으로 골라봤어요.\n\n${meal.orchestrator.summary}`,
        metadata: mergeOrchestratorMetadata(meal.orchestrator.metadata, {
          semantic_reason: "commit_gate_slot_filled",
          event_intent: "meal",
          meal_target_axis: "region",
          filled_slots: { location: resolved.searchQuery },
        }),
      };
    }

    return {
      summary: `**${resolved.searchQuery}** 근처로 볼게요. 가볍게 한 끼·든든한 한 끼 중 뭐가 끌리세요?`,
      actions: [
        {
          id: "meal-area-map",
          kind: "open",
          label: `${resolved.searchQuery} 맛집 지도`,
          href: `rimvio://navigate?place=${encodeURIComponent(`${resolved.searchQuery} 맛집`)}`,
          payload: { place: `${resolved.searchQuery} 맛집` },
        },
      ],
      source: "rules",
      confidence: 0.84,
      disclosure: "medium",
      actionsRevealed: true,
      pendingConfirm: false,
      metadata: mergeOrchestratorMetadata(undefined, {
        intent: "ACTION",
        trust_level_adjustment: "NONE",
        semantic_reason: "commit_gate_slot_filled",
        event_intent: "meal",
        meal_target_axis: "region",
        filled_slots: { location: resolved.searchQuery },
      }),
    };
  }

  if (pending.intent === "navigate" && pending.primaryMissing === "location") {
    return {
      summary: `**${trimmed}**까지 길찾기 이어갈게요.`,
      actions: [
        {
          id: "nav-resume",
          kind: "open",
          label: `${trimmed} 길찾기`,
          href: `rimvio://navigate?place=${encodeURIComponent(trimmed)}`,
          payload: { place: trimmed },
        },
      ],
      source: "rules",
      confidence: 0.85,
      disclosure: "high",
      actionsRevealed: true,
      pendingConfirm: false,
      metadata: mergeOrchestratorMetadata(undefined, {
        intent: "ACTION",
        trust_level_adjustment: "NONE",
        semantic_reason: "commit_gate_slot_filled",
        event_intent: "navigate",
      }),
    };
  }

  return null;
}

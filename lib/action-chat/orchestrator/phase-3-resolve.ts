import { buildLayeredMasterOrchestratorSystemPrompt } from "@/lib/action-chat/layered-system-prompt";
import { parseMasterOrchestratorJson } from "@/lib/action-chat/wire-to-actions";
import { orchestrateByRules } from "@/lib/action-chat/rule-orchestrator";
import { orchestrateVitalityStateIntent } from "@/lib/vitality-state/orchestrate-vitality-state-intent";
import {
  deriveOrchestratorMode,
  parseConversationalAssistantText,
  parseWittyConversationJson,
} from "@/lib/action-chat/mode-switching";
import { formatWeightedHistoryBlock } from "@/lib/action-chat/weighted-history";
import { buildWittyOrchestratorResult } from "@/lib/action-chat/witty-response-generator";
import { normalizeMasterOrchestratorWire } from "@/lib/action-chat/normalize-master-result";
import { isOpenAiConfigured, openAiApiKey, openAiVisionModel } from "@/lib/llm/openai-config";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { OrchestratorPipelineContext } from "@/lib/action-chat/orchestrator/pipeline-context";
import type { Phase3Outcome } from "@/lib/action-chat/orchestrator/pipeline-types";

function buildDynamicContextBlock(ctx: OrchestratorPipelineContext): string | null {
  return [
    ctx.enrichment.shadowContextBlock,
    ctx.enrichment.behaviorContextBlock,
    ctx.input.composerContext?.trim()
      ? `[대화창 첨부 컨텍스트]\n${ctx.input.composerContext.trim()}`
      : null,
    ctx.enrichment.containerContextBlock,
    ctx.enrichment.retrievedContextBlock,
  ]
    .filter(Boolean)
    .join("\n\n") || null;
}

/** PHASE 3 — RESOLVE: Tier 10 Intent Kernel → Tier 11/12 via normalize + dispatch paths. */
export async function runPhase3Resolve(
  ctx: OrchestratorPipelineContext
): Promise<Phase3Outcome> {
  const vitalityState = await orchestrateVitalityStateIntent({
    message: ctx.message,
    referenceDate: ctx.context.currentDate,
    existingSchedule: ctx.context.existingSchedule,
    preclassified: ctx.brain?.vitalityMatch ?? null,
  });
  if (vitalityState) {
    ctx.trace.hit(3, 10, "IntentKernel", "VitalityState");
    ctx.trace.terminal("FINAL_RETURN");
    return { phase: 3, result: vitalityState };
  }
  ctx.trace.pass(3, 10, "IntentKernel");

  if (!isOpenAiConfigured()) {
    ctx.trace.hit(3, 10, "IntentKernel", "RulesFallback");
    ctx.trace.terminal("FINAL_RETURN");
    return {
      phase: 3,
      result: orchestrateByRules({
        ...ctx.scoped,
        history: ctx.input.history,
        masterContext: ctx.context,
        intentRoute: ctx.route,
        userDefinedActions: ctx.userDefinedActions,
      }),
    };
  }

  try {
    const router = deriveOrchestratorMode(ctx.message, ctx.route);
    const mode = router.mode;
    const tone = router.tone;

    const systemPrompt = buildLayeredMasterOrchestratorSystemPrompt({
      context: ctx.context,
      route: ctx.route,
      message: ctx.message,
      linkTitle: ctx.scoped.linkTitle,
      userPreferencesOverride: ctx.input.masterContext?.userPreferences ?? null,
      mode,
      dynamicContextBlock: buildDynamicContextBlock(ctx),
    });

    const linkContext = [
      ctx.input.linkedLinks && ctx.input.linkedLinks.length >= 2
        ? `Linked context chain (priority order):\n${ctx.input.linkedLinks
            .map(
              (link, index) =>
                `${index + 1}. ${link.title}${link.url ? ` — ${link.url}` : ""}`
            )
            .join("\n")}`
        : null,
      ctx.scoped.linkTitle ? `Active link title: ${ctx.scoped.linkTitle}` : null,
      ctx.scoped.linkUrl ? `Active link URL: ${ctx.scoped.linkUrl}` : null,
      ctx.scoped.linkCategory ? `Category: ${ctx.scoped.linkCategory}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const historyBlock = formatWeightedHistoryBlock(ctx.scoped.history ?? []);

    const userPayload = [
      linkContext ? `Link context:\n${linkContext}` : null,
      historyBlock
        ? `Recent chat (temporal weights — primary turns matter most):\n${historyBlock}`
        : null,
      `User message:\n${ctx.message}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const requestBody: Record<string, unknown> = {
      model: openAiVisionModel(),
      temperature: mode === "conversation" ? 0.7 : 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPayload },
      ],
    };

    if (mode === "action") {
      requestBody.response_format = { type: "json_object" };
    } else if (tone === "WITTY") {
      requestBody.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      ctx.trace.hit(3, 10, "IntentKernel", "RulesFallback_HTTP");
      ctx.trace.terminal("FINAL_RETURN");
      return {
        phase: 3,
        result: orchestrateByRules({
          ...ctx.scoped,
          history: ctx.input.history,
          masterContext: ctx.context,
          intentRoute: ctx.route,
          userDefinedActions: ctx.userDefinedActions,
        }),
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const raw = payload.choices?.[0]?.message?.content?.trim();

    if (mode === "conversation") {
      if (tone === "WITTY" && raw) {
        const witty = parseWittyConversationJson(raw);
        if (witty) {
          ctx.trace.hit(3, 10, "IntentKernel", "WittyJSON");
          ctx.trace.terminal("FINAL_RETURN");
          return { phase: 3, result: buildWittyOrchestratorResult(witty, "openai") };
        }
      }

      const text = raw ? parseConversationalAssistantText(raw) : "";
      if (!text) {
        ctx.trace.hit(3, 10, "IntentKernel", "RulesFallback_EmptyConversation");
        ctx.trace.terminal("FINAL_RETURN");
        return {
          phase: 3,
          result: orchestrateByRules({
            ...ctx.scoped,
            history: ctx.input.history,
            masterContext: ctx.context,
            intentRoute: ctx.route,
            userDefinedActions: ctx.userDefinedActions,
          }),
        };
      }

      ctx.trace.hit(3, 10, "IntentKernel", "ConversationText");
      ctx.trace.terminal("FINAL_RETURN");
      return {
        phase: 3,
        result: {
          summary: text,
          actions: [],
          source: "openai",
          confidence: 1,
          disclosure: "none",
          actionsRevealed: false,
          pendingConfirm: false,
        },
      };
    }

    const parsed = raw ? parseMasterOrchestratorJson(raw) : null;
    if (!parsed) {
      ctx.trace.hit(3, 10, "IntentKernel", "RulesFallback_Parse");
      ctx.trace.terminal("FINAL_RETURN");
      return {
        phase: 3,
        result: orchestrateByRules({
          ...ctx.scoped,
          history: ctx.input.history,
          masterContext: ctx.context,
          intentRoute: ctx.route,
          userDefinedActions: ctx.userDefinedActions,
        }),
      };
    }

    ctx.trace.terminal("FINAL_RETURN");

    return {
      phase: 3,
      result: normalizeMasterOrchestratorWire({
        wire: parsed,
        source: "openai",
        existingSchedule: ctx.context.existingSchedule,
      }),
    };
  } catch {
    ctx.trace.hit(3, 10, "IntentKernel", "RulesFallback_Exception");
    ctx.trace.terminal("FINAL_RETURN");
    return {
      phase: 3,
      result: orchestrateByRules({
        ...ctx.scoped,
        history: ctx.input.history,
        masterContext: ctx.context,
        intentRoute: ctx.route,
        userDefinedActions: ctx.userDefinedActions,
      }),
    };
  }
}

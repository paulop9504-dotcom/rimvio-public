import { NextResponse } from "next/server";
import { buildOrchestrateFallbackResult } from "@/lib/action-chat/build-orchestrate-fallback";
import { orchestrateUserMessage } from "@/lib/action-chat/orchestrate-user-message";
import type { MasterContextApiPayload } from "@/lib/action-chat/client-master-context";
import { isChatAxis } from "@/lib/action-chat/chat-three-axis";
import { normalizeActiveChains } from "@/lib/containers/container-types";
import { observeAndLogLiveTurn } from "@/lib/self-learning/observe-and-log-turn";
import { parseVitalityMemoryWire } from "@/lib/action-chat/adaptive-behavior/ux-guards/vitality-state-decay";

export const runtime = "nodejs";

/** §6 — Must call `orchestrateUserMessage` → `runOrchestratorPipeline` only (no `buildGoalSnapshot` here). */

export async function POST(request: Request) {
  let body:
    | {
        message?: string;
        composerContext?: string | null;
        history?: Array<{ role: "user" | "assistant"; content: string }>;
        linkTitle?: string | null;
        linkUrl?: string | null;
        linkCategory?: string | null;
        activeChains?: string[];
        linkedLinks?: Array<{
          id: string;
          title: string;
          url: string | null;
          category: string | null;
        }>;
        masterContext?: MasterContextApiPayload | null;
        chatAxis?: string | null;
        vitalityMemory?: {
          states: string[];
          recordedAt: string;
        } | null;
      }
    | undefined;

  try {
    body = (await request.json()) as NonNullable<typeof body>;

    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "message_required" }, { status: 400 });
    }

    const masterContext = body.masterContext ?? null;
    if (body.activeChains?.length && masterContext) {
      masterContext.activeChains = normalizeActiveChains(body.activeChains);
    }

    const result = await orchestrateUserMessage({
      message,
      composerContext: body.composerContext ?? null,
      history: body.history,
      linkTitle: body.linkTitle,
      linkUrl: body.linkUrl,
      linkCategory: body.linkCategory,
      linkedLinks: body.linkedLinks,
      masterContext,
      chatAxis: isChatAxis(body.chatAxis) ? body.chatAxis : undefined,
      vitalityMemory: parseVitalityMemoryWire(body.vitalityMemory),
    });

    try {
      observeAndLogLiveTurn({
        stage: "output",
        userMessage: message,
        assistantSummary: result.summary,
        metadata: (result.metadata ?? undefined) as Record<string, unknown> | undefined,
        vitality: (result.metadata as { vitality_states?: string[] } | undefined)
          ?.vitality_states,
        source: "server",
        history: body.history,
      });
    } catch (logError) {
      console.error("[orchestrate] live-turn log failed", logError);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[orchestrate] failed", error);
    const message = (() => {
      try {
        return body?.message?.trim() ?? "";
      } catch {
        return "";
      }
    })();
    if (message) {
      const recovery = buildOrchestrateFallbackResult({
        message,
        linkTitle: body?.linkTitle ?? null,
        linkUrl: body?.linkUrl ?? null,
      });
      return NextResponse.json(recovery);
    }
    return NextResponse.json({ error: "orchestrate_failed" }, { status: 500 });
  }
}

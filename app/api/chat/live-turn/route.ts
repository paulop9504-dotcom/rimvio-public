import { NextResponse } from "next/server";
import { isChatAxis } from "@/lib/action-chat/chat-three-axis";
import { observeAndLogLiveTurn } from "@/lib/self-learning/observe-and-log-turn";
import type { LiveTurnStage } from "@/lib/self-learning/live-turn-types";

export const runtime = "nodejs";

const STAGES = new Set<LiveTurnStage>(["input", "routing", "output"]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      stage?: unknown;
      userMessage?: string;
      assistantSummary?: string;
      messageId?: string;
      chatAxis?: string | null;
      metadata?: Record<string, unknown>;
      vitality?: string[];
      latencyMs?: number;
      source?: "client" | "server";
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    };

    const stage = body.stage;
    const userMessage = body.userMessage?.trim();
    if (!STAGES.has(stage as LiveTurnStage) || !userMessage) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const entry = observeAndLogLiveTurn({
      stage: stage as LiveTurnStage,
      userMessage,
      assistantSummary: body.assistantSummary,
      messageId: body.messageId,
      chatAxis: isChatAxis(body.chatAxis) ? body.chatAxis : undefined,
      metadata: body.metadata,
      vitality: body.vitality,
      latencyMs: body.latencyMs,
      source: body.source === "server" ? "server" : "client",
      history: body.history,
    });

    return NextResponse.json({ ok: true, id: entry.timestamp });
  } catch (error) {
    console.error("[live-turn] failed", error);
    return NextResponse.json({ error: "live_turn_failed" }, { status: 500 });
  }
}

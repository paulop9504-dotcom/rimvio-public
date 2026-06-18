import { NextResponse } from "next/server";
import { isChatAxis } from "@/lib/action-chat/chat-three-axis";
import { appendHitRunFeedback } from "@/lib/action-chat/hit-run-feedback/append-hit-run-feedback";
import type { HitRunFeedbackVerdict } from "@/lib/action-chat/hit-run-feedback/types";

export const runtime = "nodejs";

function isVerdict(value: unknown): value is HitRunFeedbackVerdict {
  return value === "up" || value === "down";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      verdict?: unknown;
      messageId?: string;
      userMessage?: string;
      assistantSummary?: string;
      chatAxis?: string | null;
      metadata?: Record<string, unknown>;
    };

    if (!isVerdict(body.verdict)) {
      return NextResponse.json({ error: "invalid_verdict" }, { status: 400 });
    }

    const messageId = body.messageId?.trim();
    const assistantSummary = body.assistantSummary?.trim();
    if (!messageId || !assistantSummary) {
      return NextResponse.json({ error: "message_required" }, { status: 400 });
    }

    const entry = appendHitRunFeedback({
      verdict: body.verdict,
      messageId,
      userMessage: body.userMessage,
      assistantSummary,
      chatAxis: isChatAxis(body.chatAxis) ? body.chatAxis : undefined,
      metadata: body.metadata,
    });

    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    console.error("[hit-run-feedback] failed", error);
    return NextResponse.json({ error: "feedback_failed" }, { status: 500 });
  }
}

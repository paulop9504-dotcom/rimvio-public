import { NextResponse } from "next/server";
import {
  enqueueReviewExecution,
  getReviewExecutionQueueSnapshot,
  pushReviewExecution,
} from "@/lib/event-os/review-execution-queue";
import { drainReviewExecutionQueue } from "@/lib/event-os/review-execution-orchestrator";
import { orchestrateViaReviewExecutionQueue } from "@/lib/event-os/resolve-review-execution-orchestrator";
import type { ReviewExecutionInput } from "@/lib/event-os/review-execution-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      op?: "enqueue" | "process" | "enqueue_and_process";
      input?: ReviewExecutionInput;
      scopeId?: string;
      message?: string;
    };

    if (body.message?.trim()) {
      const orchestrator = orchestrateViaReviewExecutionQueue({
        message: body.message.trim(),
        scopeId: body.scopeId,
      });
      return NextResponse.json({
        ok: Boolean(orchestrator),
        orchestrator,
        processed: [],
        remaining: getReviewExecutionQueueSnapshot(),
      });
    }

    if (body.op === "process") {
      const result = drainReviewExecutionQueue({
        scopeId: body.scopeId,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (!body.input?.scopeId || !body.input?.type) {
      return NextResponse.json({ error: "input_required" }, { status: 400 });
    }

    if (body.op === "enqueue") {
      pushReviewExecution(body.input);
      return NextResponse.json({
        ok: true,
        processed: [],
        remaining: getReviewExecutionQueueSnapshot(),
      });
    }

    const result = enqueueReviewExecution(body.input);
    return NextResponse.json({
      ok: true,
      ...result,
      orchestrator: result.processed[result.processed.length - 1]?.orchestrator ?? null,
    });
  } catch (error) {
    console.error("[review-execution] failed", error);
    return NextResponse.json({ error: "review_execution_failed" }, { status: 500 });
  }
}

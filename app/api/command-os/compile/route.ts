import { NextResponse } from "next/server";
import { compileCommandToEventOs } from "@/lib/command-os/compile-command-to-event-os";
import { isCommandOsInput } from "@/lib/command-os/parse-command-input";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { input?: string };
    const input = body.input?.trim();
    if (!input) {
      return NextResponse.json({ error: "input_required" }, { status: 400 });
    }
    if (!isCommandOsInput(input)) {
      return NextResponse.json({ error: "invalid_command_syntax" }, { status: 400 });
    }

    const compiled = compileCommandToEventOs(input);
    const last = compiled.runtime.runtime?.processed.at(-1);

    return NextResponse.json({
      ok: true,
      candidate: compiled.candidate,
      executionGraph: compiled.runtime.executionGraph,
      proof: last?.proof,
      uiEmit: last?.uiEmit,
      orchestrator: last?.orchestrator ?? null,
      runtime: compiled.runtime,
    });
  } catch (error) {
    console.error("[command-os/compile] failed", error);
    return NextResponse.json({ error: "command_compile_failed" }, { status: 500 });
  }
}

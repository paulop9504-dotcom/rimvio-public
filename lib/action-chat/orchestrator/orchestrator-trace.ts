import type { OrchestratorPhase, OrchestratorTierId, OrchestratorTierLabel } from "@/lib/action-chat/orchestrator/pipeline-types";

export type TraceLabel = OrchestratorTierLabel | (string & {});

export type TraceEvent =
  | { kind: "pass"; phase: OrchestratorPhase; tier: OrchestratorTierId; label: TraceLabel }
  | {
      kind: "hit";
      phase: OrchestratorPhase;
      tier: OrchestratorTierId;
      label: TraceLabel;
      detail?: string;
    }
  | { kind: "inject"; phase: 2; tier: OrchestratorTierId; label: TraceLabel; detail?: string }
  | { kind: "fast_path"; tier: OrchestratorTierId; label: TraceLabel; detail?: string }
  | { kind: "terminal"; mode: "EARLY_RETURN" | "FINAL_RETURN" | "KERNEL_OS" };

export class OrchestratorTrace {
  private readonly events: TraceEvent[] = [];

  pass(phase: OrchestratorPhase, tier: OrchestratorTierId, label: TraceLabel) {
    this.events.push({ kind: "pass", phase, tier, label });
  }

  hit(
    phase: OrchestratorPhase,
    tier: OrchestratorTierId,
    label: TraceLabel,
    detail?: string
  ) {
    this.events.push({ kind: "hit", phase, tier, label, detail });
  }

  inject(tier: OrchestratorTierId, label: TraceLabel, detail?: string) {
    this.events.push({ kind: "inject", phase: 2, tier, label, detail });
  }

  fastPath(tier: OrchestratorTierId, label: TraceLabel, detail?: string) {
    this.events.push({ kind: "fast_path", tier, label, detail });
  }

  terminal(mode: "EARLY_RETURN" | "FINAL_RETURN" | "KERNEL_OS") {
    this.events.push({ kind: "terminal", mode });
  }

  toLogLines(): string[] {
    const parts: string[] = [];
    let phase: OrchestratorPhase | null = null;

    for (const event of this.events) {
      if (event.kind === "pass") {
        if (phase !== event.phase) {
          phase = event.phase;
          parts.push(`Phase${event.phase}`);
        }
        parts.push(`T${event.tier}:${event.label}:pass`);
      } else if (event.kind === "hit") {
        if (phase !== event.phase) {
          phase = event.phase;
          parts.push(`Phase${event.phase}`);
        }
        const detail = event.detail ? `(${event.detail})` : "";
        parts.push(`T${event.tier}:${event.label}:HIT${detail}`);
      } else if (event.kind === "inject") {
        if (phase !== 2) {
          phase = 2;
          parts.push("Phase2");
        }
        const detail = event.detail ? `(${event.detail})` : "";
        parts.push(`T${event.tier}:${event.label}:inject${detail}`);
      } else if (event.kind === "fast_path") {
        const detail = event.detail ? `(${event.detail})` : "";
        parts.push(`T${event.tier}:${event.label}:FAST_PATH${detail}`);
      } else if (event.kind === "terminal") {
        parts.push(event.mode);
      }
    }

    return parts.length > 0 ? [`[Trace] ${parts.join(" -> ")}`] : [];
  }

  snapshot(): string[] {
    return this.toLogLines();
  }
}

export function isOrchestratorTraceEnabled() {
  return process.env.RIMVIO_ORCHESTRATOR_TRACE === "1";
}

export function emitOrchestratorTrace(lines: string[]) {
  if (!isOrchestratorTraceEnabled() || lines.length === 0) {
    return;
  }
  for (const line of lines) {
    console.info(line);
  }
}

import type { CommandCompileResult } from "@/lib/command-os/command-os-types";
import type { UiEmitFromProof } from "@/lib/event-os/runtime/event-os-runtime-types";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { CausalProof } from "@/lib/event-os/causal-proof-types";

export type CommandOsClientResponse = CommandCompileResult & {
  ok: boolean;
  orchestrator?: OrchestratorResult | null;
  proof?: CausalProof;
  uiEmit?: UiEmitFromProof;
};

export async function submitCommandCompile(
  input: string
): Promise<CommandOsClientResponse> {
  const response = await fetch("/api/command-os/compile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });

  if (!response.ok) {
    throw new Error("command_compile_failed");
  }

  return (await response.json()) as CommandOsClientResponse;
}

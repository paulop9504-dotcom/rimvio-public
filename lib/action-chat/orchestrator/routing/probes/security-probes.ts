import { trySystemKillSwitch } from "@/lib/action-chat/orchestrator/try-system-kill-switch";
import { orchestrateContentPolicy } from "@/lib/policy/orchestrate-content-policy";
import { orchestratePiiSecurityGate } from "@/lib/safety/pii-security-gate";
import type { PrePipelineProbe } from "@/lib/action-chat/orchestrator/routing/pre-pipeline-probe-types";

export const killSwitchProbe: PrePipelineProbe = async () => {
  const killSwitch = trySystemKillSwitch();
  if (!killSwitch) {
    return null;
  }
  return { tier: 0, label: "KillSwitch", terminal: "EARLY_RETURN", partial: killSwitch };
};

export const piiSecurityProbe: PrePipelineProbe = async (base) => {
  const piiGate = orchestratePiiSecurityGate(base.message);
  if (!piiGate) {
    return null;
  }
  return {
    tier: 1,
    label: "Security",
    detail: "PII",
    terminal: "EARLY_RETURN",
    partial: piiGate,
  };
};

export const contentPolicyProbe: PrePipelineProbe = async (base) => {
  const contentPolicy = await orchestrateContentPolicy(base.message);
  if (!contentPolicy) {
    return null;
  }
  return {
    tier: 1,
    label: "Security",
    detail: "ContentPolicy",
    terminal: "EARLY_RETURN",
    partial: contentPolicy,
  };
};

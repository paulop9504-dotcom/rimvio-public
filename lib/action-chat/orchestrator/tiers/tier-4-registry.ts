import { interceptActionOsFromMessage } from "@/lib/action-os/intercept-action-os";
import type { Phase1TierRunner } from "@/lib/action-chat/orchestrator/tier-runner";

export const TIER_4_REGISTRY_RUNNERS: Phase1TierRunner[] = [
  {
    tier: 4,
    label: "Registry",
    detail: "NLRegister",
    run: (ctx) => interceptActionOsFromMessage(ctx.message),
  },
];

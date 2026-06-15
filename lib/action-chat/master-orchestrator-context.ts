import type { ContextContainer } from "@/lib/containers/context-containers";
import type { CanonicalContainerKey } from "@/lib/containers/container-types";
import type { ActiveContainerChain } from "@/lib/containers/container-chain";
import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";
import type { TrustStaircaseStage } from "@/lib/preferences/action-trust";

export type MasterOrchestratorContext = {
  currentDate: string;
  trustLevel: TrustStaircaseStage;
  existingSchedule: ExistingScheduleInput;
  activeContainers: ContextContainer[];
  /** @deprecated use activeChains */
  activeChain?: ActiveContainerChain | null;
  /** State Manager output: ["bitcoin_trader", "news_briefing"] */
  activeChains?: CanonicalContainerKey[];
};

export function trustStageToLabel(stage: TrustStaircaseStage) {
  if (stage === 1) {
    return "Lv1 (확인형)";
  }
  if (stage === 2) {
    return "Lv2 (제안형)";
  }
  return "Lv3 (실행형)";
}

export function buildMasterContextInjection(context: MasterOrchestratorContext) {
  return [
    `[Current_Date]: ${context.currentDate}`,
    `[User_Trust_Level]: ${trustStageToLabel(context.trustLevel)}`,
    `[Existing_Schedule]: ${JSON.stringify(context.existingSchedule)}`,
    `[Active_Containers]: ${JSON.stringify(
      context.activeContainers.map((item) => ({
        id: item.id,
        title: item.title,
        topic: item.topic ?? null,
        itemCount: item.itemCount,
      }))
    )}`,
  ].join("\n");
}

export function defaultMasterOrchestratorContext(
  partial?: Partial<MasterOrchestratorContext>
): MasterOrchestratorContext {
  return {
    currentDate: new Date().toISOString().slice(0, 10),
    trustLevel: 1,
    existingSchedule: [],
    activeContainers: [],
    activeChains: [],
    ...partial,
  };
}

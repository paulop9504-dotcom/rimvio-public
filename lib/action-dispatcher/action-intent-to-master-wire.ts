import { dispatchAction } from "@/lib/action-dispatcher/dispatch-action";
import type { ActionIntentWire } from "@/lib/action-dispatcher/types";
import type {
  MasterOrchestratorWire,
  OrchestratorActionWire,
} from "@/lib/action-chat/orchestrator-types";

/** Action Intent wire → master orchestrator payload with dispatched URL. */
export function actionIntentToMasterWire(wire: ActionIntentWire): MasterOrchestratorWire {
  const dispatched = dispatchAction(wire);

  const action: OrchestratorActionWire = {
    label: dispatched.label,
    icon: dispatched.type === "EXECUTE" ? "check" : "link",
    action_type: "DEEP_LINK",
    url: dispatched.url,
  };

  const summary =
    dispatched.type === "EXECUTE"
      ? `${dispatched.label}로 진행할게요.`
      : `관련 페이지를 열어볼게요.`;

  return {
    summary,
    thought: wire.thought,
    actions: [action],
    metadata: {
      intent: "ACTION",
      trust_level_adjustment: "NONE",
    },
    actionOsDock: {
      strategy: "DYNAMIC_INFERENCE",
      main_action: {
        label: dispatched.label,
        execution: {
          type: dispatched.type,
          uri: dispatched.url,
          action_id: dispatched.action_id,
          params: wire.params,
        },
      },
      shadow_actions: [],
    },
  } as MasterOrchestratorWire;
}

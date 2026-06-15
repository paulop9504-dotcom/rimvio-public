import type { DockActionWire, DockUpdateWire } from "@/lib/action-os/types";
import { resolveDockAction } from "@/lib/action-dispatcher/resolve-dock-execution";
import type {
  MasterOrchestratorWire,
  OrchestratorActionWire,
} from "@/lib/action-chat/orchestrator-types";

function dockActionToWire(action: DockActionWire, primary: boolean): OrchestratorActionWire {
  return {
    label: action.label,
    icon: primary ? "check" : "link",
    action_type: "DEEP_LINK",
    url: action.execution.uri,
  };
}

/** DOCK_UPDATE → master wire. thought is internal-only — never passed to UI. */
export function dockUpdateToMasterWire(wire: DockUpdateWire): MasterOrchestratorWire {
  const main = resolveDockAction(wire.main_action);
  const shadows = wire.shadow_actions.map((item) => resolveDockAction(item));

  const actions: OrchestratorActionWire[] = [
    dockActionToWire(main, true),
    ...shadows.map((item) => dockActionToWire(item, false)),
  ].slice(0, 5);

  return {
    summary: `${main.label}로 진행할게요.`,
    actions,
    metadata: {
      intent: "ACTION",
      trust_level_adjustment: "NONE",
    },
    actionOsDock: {
      strategy: wire.strategy,
      main_action: main,
      shadow_actions: shadows,
    },
  } as MasterOrchestratorWire;
}

export type {
  ActionSpawnPhase,
  SpawnPhaseInput,
  SpawnPhaseResult,
} from "@/lib/action-spawn/types";

export {
  resolveLifecycleSpawnPhase,
  shouldHideAuxForPhase,
} from "@/lib/action-spawn/resolve-lifecycle-phase";

export {
  resolvePluginDeeplink,
  type DeeplinkContext,
} from "@/lib/action-spawn/resolve-plugin-deeplink";

export { openSpawnAction } from "@/lib/action-spawn/open-spawn-action";

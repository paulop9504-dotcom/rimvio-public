import {
  mergeOrchestratorMetadata,
  type OrchestratorResult,
} from "@/lib/action-chat/orchestrator-types";
import type { LinkActionItem } from "@/types/database";

/** Show top-1 place; defer the rest behind one chip. */
export function applyProgressiveDisclosure(
  result: OrchestratorResult
): OrchestratorResult {
  const options = result.cafeDiscovery?.options;
  if (!options || options.length <= 1) {
    return result;
  }

  const [primary, ...rest] = options;
  const hiddenCount = rest.length;

  const moreAction: LinkActionItem = {
    id: "progressive-disclosure-more",
    label: `다른 옵션 ${hiddenCount}곳 보기`,
    kind: "custom",
    payload: {
      experienceChoicePrompt: `아까 추천 중 ${rest.map((o) => o.name).join(", ")}도 비교해줘`,
      progressiveDisclosure: true,
    },
  };

  const primaryName = primary?.name ?? "추천";
  const summary = `**${primaryName}**이(가) 지금 조건에 가장 잘 맞아요.${primary?.reason ? ` ${primary.reason}` : ""}`;

  return {
    ...result,
    summary,
    actions: [moreAction, ...(result.actions ?? [])],
    actionsRevealed: true,
    cafeDiscovery: result.cafeDiscovery
      ? {
          ...result.cafeDiscovery,
          summary,
          options: [primary, ...rest],
        }
      : undefined,
    metadata: mergeOrchestratorMetadata(result.metadata, {
      progressive_disclosure: true,
      hidden_option_count: hiddenCount,
    }),
  };
}

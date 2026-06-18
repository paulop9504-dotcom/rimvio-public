import { applyDisclosureToOrchestratorResult } from "@/lib/action-chat/action-confidence";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { validateLinkAction } from "@/lib/actions/action-validator";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import { buildProductDecisionContext } from "@/lib/product-injector/parse-shopping-intent";
import { runHybridRetrieval } from "@/lib/hybrid-retrieval/run-hybrid-retrieval";
import type { HybridRetrievalItem } from "@/lib/hybrid-retrieval/types";

function actionLabel(item: HybridRetrievalItem, primary: boolean): string {
  return primary ? `${item.name} · ${Math.round(item.score * 100)}%` : item.name;
}

export async function orchestrateHybridRetrieval(input: {
  message: string;
}): Promise<OrchestratorResult | null> {
  const context = buildProductDecisionContext(input.message);

  const result = await runHybridRetrieval({
    user_query: input.message,
    context,
  });

  if (!result) {
    return null;
  }

  const items = [result.top_pick, ...result.alternatives];
  const actions = items
    .map((item, index) => {
      const open = createOpenAction({
        label: actionLabel(item, index === 0),
        href: item.url,
        icon: "link",
        copyText: item.url,
        payload: {
          hybridRetrieval: true,
          rank: index + 1,
          score: item.score,
          primary: index === 0,
        },
      });
      return validateLinkAction(open);
    })
    .filter((action): action is NonNullable<typeof action> => action !== null);

  if (actions.length === 0) {
    return null;
  }

  const confidence = result.top_pick.score;

  return applyDisclosureToOrchestratorResult(
    {
      summary: result.top_pick.name,
      actions,
      source: "rules",
      confidence,
      metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
      actionsRevealed: true,
      pendingConfirm: false,
      thought: `hybrid_retrieval:${result.intent}:${result.decomposed.sub_intent}`,
    },
    confidence,
  );
}

import { applyLearnedProductWeights } from "@/lib/hybrid-retrieval/apply-learned-weights";
import { decomposeHybridIntent } from "@/lib/hybrid-retrieval/decompose-intent";
import { buildHybridRetrievalWire } from "@/lib/hybrid-retrieval/merge-hybrid-ranking";
import { retrieveHybridCandidates } from "@/lib/hybrid-retrieval/retrieve-web-candidates";
import { scoreCandidatesHybrid } from "@/lib/hybrid-retrieval/score-candidates-llm";
import type {
  HybridRetrievalInput,
  HybridRetrievalOutput,
  HybridRetrievalWire,
} from "@/lib/hybrid-retrieval/types";

/** Full hybrid pipeline: intent → web → LLM score → ranked output. */
export async function runHybridRetrieval(
  input: HybridRetrievalInput,
): Promise<HybridRetrievalWire | null> {
  const decomposed = decomposeHybridIntent(input.user_query, input.context);
  if (!decomposed) {
    return null;
  }

  const candidates = await retrieveHybridCandidates({
    decomposed,
    user_query: input.user_query,
    context: input.context,
  });

  if (candidates.length === 0) {
    return null;
  }

  const scored = await scoreCandidatesHybrid({
    decomposed,
    user_query: input.user_query,
    candidates,
    context: input.context,
  });

  const weighted = applyLearnedProductWeights({ scored, context: input.context });

  return buildHybridRetrievalWire(decomposed, weighted);
}

export async function runHybridRetrievalPublic(
  input: HybridRetrievalInput,
): Promise<HybridRetrievalOutput | null> {
  const wire = await runHybridRetrieval(input);
  if (!wire) {
    return null;
  }

  const { decomposed: _d, candidates: _c, ...publicOutput } = wire;
  return publicOutput;
}

export function runHybridRetrievalJson(input: HybridRetrievalInput): Promise<string | null> {
  return runHybridRetrievalPublic(input).then((result) =>
    result ? JSON.stringify(result) : null,
  );
}

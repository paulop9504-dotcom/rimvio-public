import { updateProductWeights } from "@/lib/product-self-learning/update-product-weights";
import type { ProductLearningInput, ProductLearningOutput } from "@/lib/product-self-learning/types";

/** Full product self-learning loop — logs in, weights out. */
export function runProductSelfLearningLoop(
  input: ProductLearningInput,
): ProductLearningOutput {
  return updateProductWeights(input);
}

import { mutateHardModeInput } from "@/lib/testing/hard-mode/mutate-hard-mode";

export const UNIFIED_STRESS_MUTATION_ROUNDS = 10;

/** Structure-preserving mutation — 1–3 token swaps, max 10 rounds. */
export function mutateUnifiedStressInput(input: string, iteration: number): string {
  return mutateHardModeInput(input, iteration);
}

export async function runFailureLoop<T>(input: {
  baseInput: string;
  maxAttempts?: number;
  run: (text: string) => Promise<T>;
  evaluate: (result: T) => boolean;
}): Promise<{ result: T; attempts: number; finalInput: string }> {
  const max = input.maxAttempts ?? UNIFIED_STRESS_MUTATION_ROUNDS;
  let currentInput = input.baseInput;

  for (let attempt = 0; attempt <= max; attempt++) {
    const result = await input.run(currentInput);
    if (input.evaluate(result)) {
      return { result, attempts: attempt, finalInput: currentInput };
    }
    if (attempt < max) {
      currentInput = mutateUnifiedStressInput(input.baseInput, attempt + 1);
    }
  }

  const lastResult = await input.run(currentInput);
  return { result: lastResult, attempts: max, finalInput: currentInput };
}

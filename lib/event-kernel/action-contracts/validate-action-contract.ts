import { getActionContract } from "@/lib/event-kernel/action-contracts/action-contract-registry";

export type ValidateActionContractInput = {
  action: string;
  extractedSlots: Record<string, unknown>;
};

export type ValidateActionContractResult = {
  valid: boolean;
  missingSlots: string[];
};

function slotIsFilled(
  extractedSlots: Record<string, unknown>,
  slot: string
): boolean {
  const value = extractedSlots[slot];
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return true;
}

/**
 * Checks required slots for a registered action contract.
 * Does not execute actions or touch kernel state.
 */
export function validateActionContract(
  input: ValidateActionContractInput
): ValidateActionContractResult {
  const contract = getActionContract(input.action);
  if (!contract) {
    return { valid: false, missingSlots: [] };
  }

  const missingSlots = contract.requiredSlots.filter(
    (slot) => !slotIsFilled(input.extractedSlots, slot)
  );

  return {
    valid: missingSlots.length === 0,
    missingSlots,
  };
}

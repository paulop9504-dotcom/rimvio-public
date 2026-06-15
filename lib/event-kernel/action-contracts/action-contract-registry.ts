/**
 * Action Contract Registry — required slots per executable action.
 * Declarative only: no execution, no kernel coupling.
 */

export type ActionContract = {
  action: string;
  requiredSlots: string[];
};

/** Canonical slot names referenced by contracts. */
export const ACTION_CONTRACT_SLOTS = {
  destination: "destination",
  entity: "entity",
  location: "location",
} as const;

export type ActionContractSlot =
  (typeof ACTION_CONTRACT_SLOTS)[keyof typeof ACTION_CONTRACT_SLOTS];

const REGISTRY: Readonly<Record<string, readonly string[]>> = {
  NAVIGATE: [ACTION_CONTRACT_SLOTS.destination],
  PRICE_LOOKUP: [ACTION_CONTRACT_SLOTS.entity],
  WEATHER: [ACTION_CONTRACT_SLOTS.location],
  MEAL_RECOMMENDATION: [],
  SCHEDULE_ORGANIZE: [],
  APPROVE_PENDING_EVENTS: [],
};

function toContract(action: string, requiredSlots: readonly string[]): ActionContract {
  return {
    action,
    requiredSlots: [...requiredSlots],
  };
}

/** All registered action contracts (stable sort by action id). */
export function listActionContracts(): ActionContract[] {
  return Object.keys(REGISTRY)
    .sort()
    .map((action) => toContract(action, REGISTRY[action] ?? []));
}

/** Lookup contract for an action id. Returns null when unknown. */
export function getActionContract(action: string): ActionContract | null {
  const key = action.trim();
  if (!key || !(key in REGISTRY)) {
    return null;
  }
  return toContract(key, REGISTRY[key]!);
}

/** True when the action has a registered contract. */
export function isRegisteredActionContract(action: string): boolean {
  return getActionContract(action) !== null;
}

/** Required slot names for an action (empty array if none or unknown). */
export function requiredSlotsForAction(action: string): string[] {
  return getActionContract(action)?.requiredSlots ?? [];
}

/** Frozen registry map for introspection — do not mutate. */
export const ACTION_CONTRACT_REGISTRY: Readonly<Record<string, ActionContract>> =
  Object.freeze(
    Object.fromEntries(
      listActionContracts().map((contract) => [contract.action, contract])
    )
  );

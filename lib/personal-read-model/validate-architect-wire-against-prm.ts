import type { ActionArchitectWire } from "@/lib/action-registry/types";
import { assemblePersonalReadPacket } from "@/lib/personal-read-model/assemble-personal-read-packet";
import { validateActionContract } from "@/lib/personal-read-model/validate-action-contract";

/** Gate ActionArchitect LLM output against PRM registry snapshot. */
export function validateArchitectWireAgainstPrm(wire: ActionArchitectWire): boolean {
  if (!wire.template_id && !wire.main_action?.type) {
    return false;
  }

  const packet = assemblePersonalReadPacket({
    scope: typeof window === "undefined" ? "server" : "client",
    bypassCache: true,
  });

  const validated = validateActionContract(
    {
      templateId: wire.template_id,
      filledSlots: {},
      mainActionType: wire.main_action?.type ?? null,
    },
    packet,
  );

  return validated != null;
}

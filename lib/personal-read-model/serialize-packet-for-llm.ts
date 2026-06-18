import type { PersonalReadPacket } from "@/lib/personal-read-model/types";
import { redactPacketForExplorer } from "@/lib/personal-read-model/redact-packet-for-explorer";

const MAX_TOP_EDGES = 5;
const MAX_ROLLUP = 8;
const MAX_REGISTRY = 12;
const MAX_RANKED_MAIN = 3;

/** Compact JSON block for LLM prompt injection — no raw EventCandidate blobs. */
export function serializePacketForLlm(
  packet: PersonalReadPacket,
  input?: { redactPrivateFacts?: boolean },
): string {
  const redact =
    input?.redactPrivateFacts === true &&
    (packet.meta.scopeAi === "explorer" || packet.experience.focus.visibility === "external");
  const source = redact ? redactPacketForExplorer(packet) : packet;

  const payload = {
    version: 1,
    meta: source.meta,
    fact: source.fact,
    experience: source.experience,
    meaning: {
      ...source.meaning,
      topEdges: source.meaning.topEdges.slice(0, MAX_TOP_EDGES),
      rollupAffinities: source.meaning.rollupAffinities.slice(0, MAX_ROLLUP),
    },
    recall: source.recall,
    action: {
      ...source.action,
      registryEntries: source.action.registryEntries.slice(0, MAX_REGISTRY),
      rankedMainCandidates: source.action.rankedMainCandidates.slice(0, MAX_RANKED_MAIN),
    },
    gates: source.gates,
  };

  return `[PersonalReadPacket v1]\n${JSON.stringify(payload, null, 2)}`;
}

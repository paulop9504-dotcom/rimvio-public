/**
 * Rimvio canonical loop — single product circuit (IO + B2C/B2B2C/Wearable).
 * See docs/RIMVIO_CANONICAL_LOOP.md
 */

export const RIMVIO_LOOP_VERSION = "canonical-loop.v1" as const;

/** Five layers — do not skip or merge write paths across layers. */
export const RIMVIO_LOOP_LAYERS = [
  "SENSE", // ingress → marble only
  "REMEMBER", // Event SSOT + projections (read-only elsewhere)
  "DECIDE", // Surface collapse → one FEED primary
  "ACT", // execution plane OR express lane
  "LEARN", // memory + learning + synapse (after ACT only)
] as const;

export type RimvioLoopLayer = (typeof RIMVIO_LOOP_LAYERS)[number];

export type MarbleIngressChannel =
  | "peer_talk"
  | "feed_chat"
  | "orchestrator"
  | "ocr_review"
  | "hydrate";

/**
 * Express lane — completes inside chat without Headquarters card.
 * Not a second product loop; optional fast ACT for @commands.
 */
export function isExpressLaneTurn(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith("@")) {
    return false;
  }
  return /^@(알림|reminder|리마인더|알람|대화끝|톡|dm)(?:\s|$)/iu.test(trimmed);
}

/** Peer talk while DM session active — SENSE via peer_talk, not orchestrator. */
export function shouldRouteToPeerTalkIngress(input: {
  peerTalkActive: boolean;
  text: string;
  hasAttachments: boolean;
}): boolean {
  if (!input.peerTalkActive || input.hasAttachments) {
    return false;
  }
  const trimmed = input.text.trim();
  if (!trimmed || trimmed.startsWith("@")) {
    return false;
  }
  return true;
}

/**
 * Headquarters may render only when primary is a real (non-fallback) surface.
 * @see hasActiveDecisionStream in surface-collapse-controller
 */
export const HEADQUARTERS_RULE =
  "FEED shows at most one primary Surface; fallback rimvio:* never occupies HQ." as const;

/**
 * Plasticity writes allowed only after terminal execution or ignore observation.
 */
export const PLASTICITY_RULE =
  "strengthen/weaken synapse + surface memory + learning ingest — never from read/rank." as const;

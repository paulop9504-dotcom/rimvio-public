export {
  RIMVIO_LOOP_VERSION,
  RIMVIO_LOOP_LAYERS,
  HEADQUARTERS_RULE,
  PLASTICITY_RULE,
  isExpressLaneTurn,
  shouldRouteToPeerTalkIngress,
  type RimvioLoopLayer,
  type MarbleIngressChannel,
} from "@/lib/inside-out/canonical-loop";

export { commitMarbleWire } from "@/lib/inside-out/marble-commit";

export {
  ingestConversationMarble,
  ingestPeerTalkMarble,
  ingestMarbleWire,
  type IngestConversationMarbleInput,
} from "@/lib/inside-out/marble-ingest";

export { deriveUserCoreActionLabel } from "@/lib/inside-out/user-core-action-label";

export {
  SLIM_COMMAND_TOKENS,
  SLIM_MENTION_FEATURE_IDS,
  DEPRECATED_COMMAND_TOKENS,
  isSlimCommandToken,
  isSlimMentionFeatureId,
  isDeprecatedCommandToken,
} from "@/lib/inside-out/slim-command-protocol";

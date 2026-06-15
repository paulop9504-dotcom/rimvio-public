export {
  EXPERIENCE_BRIDGE_MAX_PARTICIPANTS,
  EXPERIENCE_BRIDGE_META_KEYS,
} from "@/lib/experience-bridge/constants";

export type {
  ExperienceBridgeParticipant,
  ExperienceBridgeParticipantStatus,
  ExperienceBridgeSnapshot,
  ExperienceBridgeState,
  ExperienceBridgeTimelineItem,
} from "@/lib/experience-bridge/experience-bridge-types";

export {
  canEditBridgeMedia,
  canExportBridgeMedia,
  canReadBridgeExperience,
  countActiveBridgeParticipants,
  isActiveBridgeParticipant,
} from "@/lib/experience-bridge/bridge-access";

export {
  acceptBridgeInvite,
  buildHostParticipant,
  createInitialBridgeState,
  declineBridgeInvite,
  inviteBridgeParticipant,
  leaveBridgeExperience,
  listReadableBridgeParticipants,
  removeBridgeParticipant,
} from "@/lib/experience-bridge/bridge-mutations";

export {
  buildBridgeSnapshot,
  mergeBridgeTimeline,
} from "@/lib/experience-bridge/merge-bridge-timeline";

export { ensureBridgeParticipantPin } from "@/lib/experience-bridge/build-participant-pin";
